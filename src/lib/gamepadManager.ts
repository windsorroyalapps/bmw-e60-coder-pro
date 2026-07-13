// BMW E60 Coder Pro - Xbox Gamepad Drive System
// Full gamepad integration for vehicle control via CAN bus

export interface GamepadAxes {
  leftStickX: number;   // -1.0 (left) to 1.0 (right) - Steering
  leftStickY: number;   // -1.0 (up) to 1.0 (down)
  rightStickX: number;  // -1.0 to 1.0
  rightStickY: number;  // -1.0 (up) to 1.0 (down)
  leftTrigger: number;  // 0.0 to 1.0 - Brake
  rightTrigger: number; // 0.0 to 1.0 - Throttle
}

export interface GamepadButtons {
  a: boolean;           // Confirm / Enable
  b: boolean;           // Cancel / Disable
  x: boolean;           // Toggle headlight
  y: boolean;           // Horn
  lb: boolean;          // Shift down / Left blinker
  rb: boolean;          // Shift up / Right blinker
  lt: boolean;          // Left trigger button
  rt: boolean;          // Right trigger button
  back: boolean;        // View - Disable control
  start: boolean;       // Menu - Enable control
  dpadUp: boolean;      // Cruise + / Sport mode
  dpadDown: boolean;    // Cruise - / Eco mode
  dpadLeft: boolean;    // Prev menu
  dpadRight: boolean;   // Next menu
  leftStickBtn: boolean;
  rightStickBtn: boolean;
  xbox: boolean;        // Xbox button - Emergency stop
}

export interface GamepadState {
  connected: boolean;
  enabled: boolean;
  axes: GamepadAxes;
  buttons: GamepadButtons;
  deadzone: number;
  steeringSensitivity: number;
  throttleSensitivity: number;
  brakeSensitivity: number;
  driveMode: 'sport' | 'comfort' | 'eco' | 'track';
  invertSteering: boolean;
  safetyConfirmed: boolean;
  lastUpdate: number;
}

export interface CANCommand {
  module: string;
  arbitrationId: string;
  data: string;
  description: string;
  priority: number;
}

// Xbox 360 USB identifiers (for reference)
// const XBOX_VID = 0x045E;
// const XBOX_PID = 0x028E;
// const XBOX_WIRELESS_PID = 0x0719;
// const XBOX_ONE_PID = 0x02DD;

// CAN commands for vehicle control
const CAN_COMMANDS = {
  // DME - Throttle control
  DME_THROTTLE: (percent: number): CANCommand => ({
    module: 'DME',
    arbitrationId: '0x130',
    data: `00 00 ${Math.round(percent * 2.55).toString(16).padStart(2, '0')} 00 00 00 00`,
    description: `Throttle ${percent.toFixed(1)}%`,
    priority: 1,
  }),
  // DME - Throttle 2nd channel (redundancy)
  DME_THROTTLE2: (percent: number): CANCommand => ({
    module: 'DME',
    arbitrationId: '0x131',
    data: `00 00 ${Math.round(percent * 2.55).toString(16).padStart(2, '0')} 00 00 00 00`,
    description: `Throttle R ${percent.toFixed(1)}%`,
    priority: 1,
  }),
  // DSC - Brake pressure
  DSC_BRAKE: (pressure: number): CANCommand => ({
    module: 'DSC',
    arbitrationId: '0x0A8',
    data: `00 ${Math.round(pressure * 2.55).toString(16).padStart(2, '0')} 00 00 00 00 00`,
    description: `Brake ${pressure.toFixed(1)}%`,
    priority: 1,
  }),
  // AFS - Steering angle
  AFS_STEERING: (angle: number): CANCommand => ({
    module: 'AFS',
    arbitrationId: '0x0C0',
    data: `${(Math.round((angle + 540) * 10) >> 8 & 0xFF).toString(16).padStart(2, '0')} ${(Math.round((angle + 540) * 10) & 0xFF).toString(16).padStart(2, '0')} 00 00 00 00 00 00`,
    description: `Steering ${angle.toFixed(1)}°`,
    priority: 2,
  }),
  // SZL - Steering override signal
  SZL_OVERRIDE: (active: boolean): CANCommand => ({
    module: 'SZL',
    arbitrationId: '0x1B6',
    data: active ? '01 01 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
    description: `Steering override ${active ? 'ON' : 'OFF'}`,
    priority: 2,
  }),
  // DME - Engine shutdown (emergency)
  DME_SHUTDOWN: (): CANCommand => ({
    module: 'DME',
    arbitrationId: '0x130',
    data: '00 00 00 00 00 00 00 00',
    description: 'EMERGENCY SHUTDOWN',
    priority: 0,
  }),
  // FRM - Horn
  FRM_HORN: (active: boolean): CANCommand => ({
    module: 'FRM',
    arbitrationId: '0x21A',
    data: active ? '00 00 01 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
    description: `Horn ${active ? 'ON' : 'OFF'}`,
    priority: 5,
  }),
  // FRM - Headlights
  FRM_HEADLIGHTS: (active: boolean): CANCommand => ({
    module: 'FRM',
    arbitrationId: '0x21A',
    data: active ? '00 01 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
    description: `Headlights ${active ? 'ON' : 'OFF'}`,
    priority: 5,
  }),
  // KOMBI - Blinkers
  KOMBI_BLINKER_LEFT: (active: boolean): CANCommand => ({
    module: 'KOMBI',
    arbitrationId: '0x1B4',
    data: active ? '01 00 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
    description: `Blinker L ${active ? 'ON' : 'OFF'}`,
    priority: 4,
  }),
  KOMBI_BLINKER_RIGHT: (active: boolean): CANCommand => ({
    module: 'KOMBI',
    arbitrationId: '0x1B4',
    data: active ? '02 00 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
    description: `Blinker R ${active ? 'ON' : 'OFF'}`,
    priority: 4,
  }),
};

export class GamepadManager {
  private static instance: GamepadManager;
  private state: GamepadState = {
    connected: false,
    enabled: false,
    axes: { leftStickX: 0, leftStickY: 0, rightStickX: 0, rightStickY: 0, leftTrigger: 0, rightTrigger: 0 },
    buttons: { a: false, b: false, x: false, y: false, lb: false, rb: false, lt: false, rt: false, back: false, start: false, dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false, leftStickBtn: false, rightStickBtn: false, xbox: false },
    deadzone: 0.12,
    steeringSensitivity: 1.0,
    throttleSensitivity: 1.0,
    brakeSensitivity: 1.0,
    driveMode: 'comfort',
    invertSteering: false,
    safetyConfirmed: false,
    lastUpdate: 0,
  };
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private canQueue: CANCommand[] = [];
  private listeners: Set<(state: GamepadState) => void> = new Set();
  private canListeners: Set<(cmds: CANCommand[]) => void> = new Set();
  private controlLoop: ReturnType<typeof setInterval> | null = null;
  private headlightsOn = false;

  static getInstance(): GamepadManager {
    if (!GamepadManager.instance) GamepadManager.instance = new GamepadManager();
    return GamepadManager.instance;
  }

  subscribe(callback: (state: GamepadState) => void) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  subscribeCAN(callback: (cmds: CANCommand[]) => void) {
    this.canListeners.add(callback);
    return () => this.canListeners.delete(callback);
  }

  private emit() {
    this.listeners.forEach(cb => cb({ ...this.state, axes: { ...this.state.axes }, buttons: { ...this.state.buttons } }));
  }

  private emitCAN() {
    if (this.canQueue.length > 0) {
      this.canListeners.forEach(cb => cb([...this.canQueue]));
      this.canQueue = [];
    }
  }

  getState(): GamepadState {
    return {
      ...this.state,
      axes: { ...this.state.axes },
      buttons: { ...this.state.buttons },
    };
  }

  startScanning() {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => this.pollGamepad(), 16); // 60Hz
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.state.connected = true;
      this.emit();
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.state.enabled) this.disable();
      this.state.connected = false;
      this.emit();
    });
  }

  stopScanning() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    this.disable();
  }

  private pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let found = false;
    for (const pad of pads) {
      if (!pad) continue;
      if (this.isXboxController(pad)) {
        found = true;
        this.readGamepad(pad);
      }
    }
    if (!found && this.state.connected) {
      this.state.connected = false;
      if (this.state.enabled) this.disable();
      this.emit();
    }
  }

  private isXboxController(pad: Gamepad): boolean {
    const id = pad.id.toLowerCase();
    return id.includes('xbox') || id.includes('xinput') || id.includes('045e') ||
           (pad.mapping === 'standard' && pad.buttons.length >= 16);
  }

  private readGamepad(pad: Gamepad) {
    if (!this.state.connected) { this.state.connected = true; this.emit(); }

    const dz = this.state.deadzone;
    const applyDZ = (v: number) => Math.abs(v) < dz ? 0 : (v > 0 ? (v - dz) / (1 - dz) : (v + dz) / (1 - dz));

    // Standard Xbox mapping
    this.state.axes = {
      leftStickX: applyDZ(pad.axes[0] || 0),
      leftStickY: applyDZ(pad.axes[1] || 0),
      rightStickX: applyDZ(pad.axes[2] || 0),
      rightStickY: applyDZ(pad.axes[3] || 0),
      leftTrigger: pad.buttons[6]?.value || 0,
      rightTrigger: pad.buttons[7]?.value || 0,
    };

    this.state.buttons = {
      a: pad.buttons[0]?.pressed || false,
      b: pad.buttons[1]?.pressed || false,
      x: pad.buttons[2]?.pressed || false,
      y: pad.buttons[3]?.pressed || false,
      lb: pad.buttons[4]?.pressed || false,
      rb: pad.buttons[5]?.pressed || false,
      lt: pad.buttons[6]?.pressed || false,
      rt: pad.buttons[7]?.pressed || false,
      back: pad.buttons[8]?.pressed || false,
      start: pad.buttons[9]?.pressed || false,
      leftStickBtn: pad.buttons[10]?.pressed || false,
      rightStickBtn: pad.buttons[11]?.pressed || false,
      dpadUp: pad.buttons[12]?.pressed || false,
      dpadDown: pad.buttons[13]?.pressed || false,
      dpadLeft: pad.buttons[14]?.pressed || false,
      dpadRight: pad.buttons[15]?.pressed || false,
      xbox: pad.buttons[16]?.pressed || false,
    };

    this.state.lastUpdate = Date.now();

    // Handle button actions
    this.handleButtons();

    if (this.state.enabled) { this.generateCANCommands(); }
    this.emit();
  }

  private handleButtons() {
    const btns = this.state.buttons;

    // Xbox button = Emergency stop
    if (btns.xbox && this.state.enabled) { this.emergencyStop(); return; }

    // Start = Enable (requires safety confirmation)
    if (btns.start && !this.state.enabled && this.state.safetyConfirmed) {
      this.enable();
    }

    // Back = Disable
    if (btns.back && this.state.enabled) { this.disable(); }

    // X = Toggle headlights
    if (btns.x) { this.headlightsOn = !this.headlightsOn; }

    // Y = Horn
    if (btns.y) { this.canQueue.push(CAN_COMMANDS.FRM_HORN(true)); }

    // LB/RB = Blinkers
    if (btns.lb) { this.canQueue.push(CAN_COMMANDS.KOMBI_BLINKER_LEFT(true)); }
    if (btns.rb) { this.canQueue.push(CAN_COMMANDS.KOMBI_BLINKER_RIGHT(true)); }

    // D-pad up/down = Drive mode
    if (btns.dpadUp) { this.state.driveMode = 'sport'; }
    if (btns.dpadDown) { this.state.driveMode = 'eco'; }
  }

  private generateCANCommands() {
    const axes = this.state.axes;
    const mode = this.state.driveMode;

    // Steering: left stick X → steering angle (-540° to +540°)
    const steerRaw = this.state.invertSteering ? -axes.leftStickX : axes.leftStickX;
    const steerMult = mode === 'sport' ? 0.6 : mode === 'track' ? 0.8 : 0.4;
    const steeringAngle = steerRaw * 540 * this.state.steeringSensitivity * steerMult;
    this.canQueue.push(CAN_COMMANDS.AFS_STEERING(steeringAngle));
    this.canQueue.push(CAN_COMMANDS.SZL_OVERRIDE(true));

    // Throttle: right trigger
    const throttleCurve = mode === 'sport' ? 1.5 : mode === 'eco' ? 0.7 : 1.0;
    const throttle = Math.min(100, Math.max(0, axes.rightTrigger * 100 * this.state.throttleSensitivity * throttleCurve));
    this.canQueue.push(CAN_COMMANDS.DME_THROTTLE(throttle));
    this.canQueue.push(CAN_COMMANDS.DME_THROTTLE2(throttle * 0.97)); // Redundancy channel

    // Brake: left trigger
    const brakeCurve = mode === 'track' ? 1.3 : 1.0;
    const brake = Math.min(100, Math.max(0, axes.leftTrigger * 100 * this.state.brakeSensitivity * brakeCurve));
    if (brake > 1) {
      this.canQueue.push(CAN_COMMANDS.DSC_BRAKE(brake));
      // Throttle cut when braking
      if (brake > 10) {
        this.canQueue.push(CAN_COMMANDS.DME_THROTTLE(0));
        this.canQueue.push(CAN_COMMANDS.DME_THROTTLE2(0));
      }
    }

    // Headlights
    this.canQueue.push(CAN_COMMANDS.FRM_HEADLIGHTS(this.headlightsOn));

    this.emitCAN();
  }

  enable() {
    if (!this.state.safetyConfirmed) return;
    this.state.enabled = true;
    // Start CAN transmission loop at 50Hz
    if (!this.controlLoop) {
      this.controlLoop = setInterval(() => {
        if (this.state.enabled) this.generateCANCommands();
      }, 20);
    }
    this.emit();
  }

  disable() {
    this.state.enabled = false;
    if (this.controlLoop) { clearInterval(this.controlLoop); this.controlLoop = null; }
    // Send zero commands to safely stop
    this.canQueue.push(CAN_COMMANDS.DME_THROTTLE(0));
    this.canQueue.push(CAN_COMMANDS.DME_THROTTLE2(0));
    this.canQueue.push(CAN_COMMANDS.DSC_BRAKE(0));
    this.canQueue.push(CAN_COMMANDS.AFS_STEERING(0));
    this.canQueue.push(CAN_COMMANDS.SZL_OVERRIDE(false));
    this.emitCAN();
    this.emit();
  }

  emergencyStop() {
    this.state.enabled = false;
    if (this.controlLoop) { clearInterval(this.controlLoop); this.controlLoop = null; }
    this.canQueue.push(CAN_COMMANDS.DME_SHUTDOWN());
    this.emitCAN();
    this.emit();
  }

  confirmSafety() {
    this.state.safetyConfirmed = true;
    this.emit();
  }

  setDeadzone(v: number) { this.state.deadzone = v; this.emit(); }
  setSteeringSensitivity(v: number) { this.state.steeringSensitivity = v; this.emit(); }
  setThrottleSensitivity(v: number) { this.state.throttleSensitivity = v; this.emit(); }
  setBrakeSensitivity(v: number) { this.state.brakeSensitivity = v; this.emit(); }
  setDriveMode(m: GamepadState['driveMode']) { this.state.driveMode = m; this.emit(); }
  setInvertSteering(v: boolean) { this.state.invertSteering = v; this.emit(); }
}

export const gamepadManager = GamepadManager.getInstance();
