// BMW E60 Coder Pro - Xbox Gamepad Drive System
// Full gamepad integration for vehicle control via CAN bus.
// 100% LIVE - All CAN commands are sent to the real vehicle via native bridge.

import { OBD2Bridge } from './nativeBridge';
import type { CANCommand } from './nativeBridge';

export interface GamepadAxes {
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
}

export interface GamepadButtons {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  lb: boolean;
  rb: boolean;
  lt: boolean;
  rt: boolean;
  back: boolean;
  start: boolean;
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  leftStickBtn: boolean;
  rightStickBtn: boolean;
  xbox: boolean;
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

// CAN command builders for vehicle control
const CAN_COMMANDS = {
  DME_THROTTLE: (percent: number): CANCommand => ({
    arbitrationId: '0x130',
    data: `00 00 ${Math.round(percent * 2.55).toString(16).padStart(2, '0')} 00 00 00 00`,
  }),
  DME_THROTTLE2: (percent: number): CANCommand => ({
    arbitrationId: '0x131',
    data: `00 00 ${Math.round(percent * 2.55 * 0.97).toString(16).padStart(2, '0')} 00 00 00 00`,
  }),
  DSC_BRAKE: (pressure: number): CANCommand => ({
    arbitrationId: '0x0A8',
    data: `00 ${Math.round(pressure * 2.55).toString(16).padStart(2, '0')} 00 00 00 00 00`,
  }),
  AFS_STEERING: (angle: number): CANCommand => {
    const val = Math.round((angle + 540) * 10);
    const high = (val >> 8) & 0xFF;
    const low = val & 0xFF;
    return {
      arbitrationId: '0x0C0',
      data: `${high.toString(16).padStart(2, '0')} ${low.toString(16).padStart(2, '0')} 00 00 00 00 00 00`,
    };
  },
  SZL_OVERRIDE: (active: boolean): CANCommand => ({
    arbitrationId: '0x1B6',
    data: active ? '01 01 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
  }),
  DME_SHUTDOWN: (): CANCommand => ({
    arbitrationId: '0x130',
    data: '00 00 00 00 00 00 00 00',
  }),
  FRM_HORN: (active: boolean): CANCommand => ({
    arbitrationId: '0x21A',
    data: active ? '00 00 01 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
  }),
  FRM_HEADLIGHTS: (active: boolean): CANCommand => ({
    arbitrationId: '0x21A',
    data: active ? '00 01 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
  }),
  KOMBI_BLINKER_LEFT: (active: boolean): CANCommand => ({
    arbitrationId: '0x1B4',
    data: active ? '01 00 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
  }),
  KOMBI_BLINKER_RIGHT: (active: boolean): CANCommand => ({
    arbitrationId: '0x1B4',
    data: active ? '02 00 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
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
  private controlLoop: ReturnType<typeof setInterval> | null = null;
  private headlightsOn = false;
  private listeners: Set<(state: GamepadState) => void> = new Set();

  static getInstance(): GamepadManager {
    if (!GamepadManager.instance) GamepadManager.instance = new GamepadManager();
    return GamepadManager.instance;
  }

  subscribe(callback: (state: GamepadState) => void) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  private emit() {
    this.listeners.forEach(cb => cb({
      ...this.state,
      axes: { ...this.state.axes },
      buttons: { ...this.state.buttons },
    }));
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
    this.updateInterval = setInterval(() => this.pollGamepad(), 16);

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
    this.handleButtons();

    if (this.state.enabled) {
      this.sendCANCommands();
    }
    this.emit();
  }

  private handleButtons() {
    const btns = this.state.buttons;

    if (btns.xbox && this.state.enabled) { this.emergencyStop(); return; }
    if (btns.start && !this.state.enabled && this.state.safetyConfirmed) { this.enable(); }
    if (btns.back && this.state.enabled) { this.disable(); }
    if (btns.x) { this.headlightsOn = !this.headlightsOn; }
  }

  /**
   * Send CAN commands to the REAL vehicle via native bridge.
   * No simulation - commands go directly to the car's CAN bus.
   */
  private async sendCANCommands() {
    const axes = this.state.axes;
    const mode = this.state.driveMode;

    const commands: CANCommand[] = [];

    // Steering: left stick X
    const steerRaw = this.state.invertSteering ? -axes.leftStickX : axes.leftStickX;
    const steerMult = mode === 'sport' ? 0.6 : mode === 'track' ? 0.8 : 0.4;
    const steeringAngle = steerRaw * 540 * this.state.steeringSensitivity * steerMult;
    commands.push(CAN_COMMANDS.AFS_STEERING(steeringAngle));
    commands.push(CAN_COMMANDS.SZL_OVERRIDE(true));

    // Throttle: right trigger
    const throttleCurve = mode === 'sport' ? 1.5 : mode === 'eco' ? 0.7 : 1.0;
    const throttle = Math.min(100, Math.max(0, axes.rightTrigger * 100 * this.state.throttleSensitivity * throttleCurve));
    commands.push(CAN_COMMANDS.DME_THROTTLE(throttle));
    commands.push(CAN_COMMANDS.DME_THROTTLE2(throttle * 0.97));

    // Brake: left trigger
    const brakeCurve = mode === 'track' ? 1.3 : 1.0;
    const brake = Math.min(100, Math.max(0, axes.leftTrigger * 100 * this.state.brakeSensitivity * brakeCurve));
    if (brake > 1) {
      commands.push(CAN_COMMANDS.DSC_BRAKE(brake));
      if (brake > 10) {
        commands.push(CAN_COMMANDS.DME_THROTTLE(0));
        commands.push(CAN_COMMANDS.DME_THROTTLE2(0));
      }
    }

    // Headlights
    commands.push(CAN_COMMANDS.FRM_HEADLIGHTS(this.headlightsOn));

    // Send all commands through native bridge to real vehicle
    try {
      await OBD2Bridge.sendCANCommands({ commands });
    } catch (e) {
      // Silent fail - vehicle may not be connected
    }
  }

  enable() {
    if (!this.state.safetyConfirmed) return;
    this.state.enabled = true;
    if (!this.controlLoop) {
      this.controlLoop = setInterval(() => {
        if (this.state.enabled) this.sendCANCommands();
      }, 20);
    }
    this.emit();
  }

  disable() {
    this.state.enabled = false;
    if (this.controlLoop) { clearInterval(this.controlLoop); this.controlLoop = null; }
    // Send zero commands to safely stop
    const stopCommands: CANCommand[] = [
      CAN_COMMANDS.DME_THROTTLE(0),
      CAN_COMMANDS.DME_THROTTLE2(0),
      CAN_COMMANDS.DSC_BRAKE(0),
      CAN_COMMANDS.AFS_STEERING(0),
      CAN_COMMANDS.SZL_OVERRIDE(false),
    ];
    OBD2Bridge.sendCANCommands({ commands: stopCommands }).catch(() => {});
    this.emit();
  }

  emergencyStop() {
    this.state.enabled = false;
    if (this.controlLoop) { clearInterval(this.controlLoop); this.controlLoop = null; }
    OBD2Bridge.sendCANCommands({
      commands: [CAN_COMMANDS.DME_SHUTDOWN()],
    }).catch(() => {});
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