// BMW E60 Coder Pro - Universal Gamepad Drive System
// Supports Xbox (Wired/Wireless), PS5 DualSense, PS4 DualShock, and Generic controllers.
// Includes custom key-binding support and auto-detection for vehicle control via CAN bus.

import { OBD2Bridge } from './nativeBridge';
import type { CANCommand } from './nativeBridge';

export type ControllerType = 'xbox' | 'ps5' | 'ps4' | 'generic';

export interface GamepadAxes {
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
}

export interface GamepadButtons {
  a: boolean; // Xbox A / PS Cross
  b: boolean; // Xbox B / PS Circle
  x: boolean; // Xbox X / PS Square
  y: boolean; // Xbox Y / PS Triangle
  lb: boolean;
  rb: boolean;
  lt: boolean;
  rt: boolean;
  back: boolean; // Xbox Back / PS Share/Create
  start: boolean; // Xbox Start / PS Options
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  leftStickBtn: boolean;
  rightStickBtn: boolean;
  xbox: boolean; // Xbox button / PS Button / Home
  touchpad?: boolean; // PS specific
}

export interface GamepadMapping {
  buttons: Record<keyof GamepadButtons, number>;
  axes: Record<keyof GamepadAxes, number>;
}

export interface GamepadState {
  connected: boolean;
  enabled: boolean;
  controllerType: ControllerType;
  controllerName: string;
  axes: GamepadAxes;
  buttons: GamepadButtons;
  deadzone: number;
  steeringSensitivity: number;
  throttleSensitivity: number;
  brakeSensitivity: number;
  driveMode: 'sport' | 'comfort' | 'eco' | 'track';
  invertSteering: boolean;
  safetyConfirmed: boolean;
  isRemoteStarting: boolean;
  lastUpdate: number;
  customMappingEnabled: boolean;
}

// Default Mappings
const DEFAULT_MAPPINGS: Record<ControllerType, GamepadMapping> = {
  xbox: {
    buttons: {
      a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7,
      back: 8, start: 9, leftStickBtn: 10, rightStickBtn: 11,
      dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15, xbox: 16,
      touchpad: -1
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 3,
      leftTrigger: 4, rightTrigger: 5 // Some drivers map triggers to axes 4/5
    }
  },
  ps5: {
    buttons: {
      a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7,
      back: 8, start: 9, leftStickBtn: 10, rightStickBtn: 11,
      dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15, xbox: 16, touchpad: 17
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 3,
      leftTrigger: 4, rightTrigger: 5
    }
  },
  ps4: {
    buttons: {
      a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7,
      back: 8, start: 9, leftStickBtn: 10, rightStickBtn: 11,
      dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15, xbox: 16, touchpad: 17
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 3,
      leftTrigger: 4, rightTrigger: 5
    }
  },
  generic: {
    buttons: {
      a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7,
      back: 8, start: 9, leftStickBtn: 10, rightStickBtn: 11,
      dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15, xbox: 16,
      touchpad: -1
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 3,
      leftTrigger: 4, rightTrigger: 5
    }
  }
};

// CAN command builders for vehicle control
const CAN_COMMANDS = {
  DME_THROTTLE: (percent: number): CANCommand => ({
    arbitrationId: '0x130',
    data: `00 00 ${Math.round(percent * 2.55).toString(16).padStart(2, '0')} 00 00 00 00 00`,
  }),
  DME_THROTTLE2: (percent: number): CANCommand => ({
    arbitrationId: '0x131',
    data: `00 00 ${Math.round(percent * 2.55 * 0.97).toString(16).padStart(2, '0')} 00 00 00 00 00`,
  }),
  DSC_BRAKE: (pressure: number): CANCommand => ({
    arbitrationId: '0x0A8',
    data: `00 ${Math.round(pressure * 2.55).toString(16).padStart(2, '0')} 00 00 00 00 00 00`,
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
  CAS_IGNITION: (state: 'off' | 'acc' | 'on' | 'start'): CANCommand => {
    // CAS Terminal Control (0x32E)
    // 0x40 = Terminal 15 (Ignition On)
    // 0x80 = Terminal 50 (Starter)
    let hex = '00';
    if (state === 'acc') hex = '01';
    if (state === 'on') hex = '40';
    if (state === 'start') hex = 'C0'; // T15 + T50
    return { arbitrationId: '0x32E', data: `${hex} 00 00 00 00 00 00 00` };
  },
  CAS_KEY_EMULATION: (present: boolean): CANCommand => ({
    arbitrationId: '0x12F', // Key Status
    data: present ? '40 00 00 00 00 00 00 00' : '00 00 00 00 00 00 00 00',
  }),
};

export class GamepadManager {
  private static instance: GamepadManager;
  private state: GamepadState = {
    connected: false,
    enabled: false,
    controllerType: 'generic',
    controllerName: 'Disconnected',
    axes: { leftStickX: 0, leftStickY: 0, rightStickX: 0, rightStickY: 0, leftTrigger: 0, rightTrigger: 0 },
    buttons: { a: false, b: false, x: false, y: false, lb: false, rb: false, lt: false, rt: false, back: false, start: false, dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false, leftStickBtn: false, rightStickBtn: false, xbox: false },
    deadzone: 0.12,
    steeringSensitivity: 1.0,
    throttleSensitivity: 1.0,
    brakeSensitivity: 1.0,
    driveMode: 'comfort',
    invertSteering: false,
    safetyConfirmed: false,
    isRemoteStarting: false,
    lastUpdate: 0,
    customMappingEnabled: false,
  };

  public currentMapping: GamepadMapping = DEFAULT_MAPPINGS.generic;
  public customMapping: GamepadMapping | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private controlLoop: ReturnType<typeof setInterval> | null = null;
  private headlightsOn = false;
  private hornActive = false;
  private listeners: Set<(state: GamepadState) => void> = new Set();

  static getInstance(): GamepadManager {
    if (!GamepadManager.instance) GamepadManager.instance = new GamepadManager();
    return GamepadManager.instance;
  }

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('gamepad_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.deadzone = parsed.deadzone ?? 0.12;
        this.state.steeringSensitivity = parsed.steeringSensitivity ?? 1.0;
        this.state.throttleSensitivity = parsed.throttleSensitivity ?? 1.0;
        this.state.brakeSensitivity = parsed.brakeSensitivity ?? 1.0;
        this.state.driveMode = parsed.driveMode ?? 'comfort';
        this.state.invertSteering = parsed.invertSteering ?? false;
        this.state.customMappingEnabled = parsed.customMappingEnabled ?? false;
        if (parsed.customMapping) {
          this.customMapping = parsed.customMapping;
        }
      }
    } catch (e) {
      console.error('Failed to load gamepad settings', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('gamepad_settings', JSON.stringify({
        deadzone: this.state.deadzone,
        steeringSensitivity: this.state.steeringSensitivity,
        throttleSensitivity: this.state.throttleSensitivity,
        brakeSensitivity: this.state.brakeSensitivity,
        driveMode: this.state.driveMode,
        invertSteering: this.state.invertSteering,
        customMappingEnabled: this.state.customMappingEnabled,
        customMapping: this.customMapping
      }));
    } catch (e) {
      console.error('Failed to save gamepad settings', e);
    }
  }

  subscribe(callback: (state: GamepadState) => void) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => { this.listeners.delete(callback); };
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
      this.detectController(e.gamepad);
      this.emit();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.state.enabled) this.disable();
      this.state.connected = false;
      this.state.controllerName = 'Disconnected';
      this.emit();
    });
  }

  stopScanning() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    this.disable();
  }

  private pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let foundPad: Gamepad | null = null;

    for (const pad of pads) {
      if (pad) {
        foundPad = pad;
        break; // Use the first available gamepad
      }
    }

    if (foundPad) {
      if (!this.state.connected) {
        this.detectController(foundPad);
      }
      this.readGamepad(foundPad);
    } else if (this.state.connected) {
      this.state.connected = false;
      this.state.controllerName = 'Disconnected';
      if (this.state.enabled) this.disable();
      this.emit();
    }
  }

  private detectController(pad: Gamepad) {
    const id = pad.id.toLowerCase();
    this.state.connected = true;
    this.state.controllerName = pad.id;

    if (id.includes('dualsense') || id.includes('dualshock 5') || id.includes('054c') && id.includes('0ce6')) {
      this.state.controllerType = 'ps5';
    } else if (id.includes('dualshock 4') || id.includes('sony') || id.includes('054c') && (id.includes('05c4') || id.includes('09cc'))) {
      this.state.controllerType = 'ps4';
    } else if (id.includes('xbox') || id.includes('microsoft') || id.includes('045e') || id.includes('xinput')) {
      this.state.controllerType = 'xbox';
    } else {
      this.state.controllerType = 'generic';
    }

    if (this.state.customMappingEnabled && this.customMapping) {
      this.currentMapping = this.customMapping;
    } else {
      this.currentMapping = DEFAULT_MAPPINGS[this.state.controllerType];
    }

    console.log(`Detected ${this.state.controllerType} controller: ${pad.id}`);
  }

  private readGamepad(pad: Gamepad) {
    const map = this.currentMapping;
    const dz = this.state.deadzone;

    const applyDZ = (v: number) => {
      if (v === undefined) return 0;
      return Math.abs(v) < dz ? 0 : (v > 0 ? (v - dz) / (1 - dz) : (v + dz) / (1 - dz));
    };

    // Axes
    this.state.axes = {
      leftStickX: applyDZ(pad.axes[map.axes.leftStickX]),
      leftStickY: applyDZ(pad.axes[map.axes.leftStickY]),
      rightStickX: applyDZ(pad.axes[map.axes.rightStickX]),
      rightStickY: applyDZ(pad.axes[map.axes.rightStickY]),
      leftTrigger: pad.buttons[map.buttons.lt]?.value || (pad.axes[map.axes.leftTrigger] !== undefined ? (pad.axes[map.axes.leftTrigger] + 1) / 2 : 0),
      rightTrigger: pad.buttons[map.buttons.rt]?.value || (pad.axes[map.axes.rightTrigger] !== undefined ? (pad.axes[map.axes.rightTrigger] + 1) / 2 : 0),
    };

    // Buttons
    const btn = (key: keyof GamepadButtons) => {
      const index = map.buttons[key];
      return index !== undefined && pad.buttons[index]?.pressed || false;
    };

    this.state.buttons = {
      a: btn('a'),
      b: btn('b'),
      x: btn('x'),
      y: btn('y'),
      lb: btn('lb'),
      rb: btn('rb'),
      lt: btn('lt'),
      rt: btn('rt'),
      back: btn('back'),
      start: btn('start'),
      leftStickBtn: btn('leftStickBtn'),
      rightStickBtn: btn('rightStickBtn'),
      dpadUp: btn('dpadUp'),
      dpadDown: btn('dpadDown'),
      dpadLeft: btn('dpadLeft'),
      dpadRight: btn('dpadRight'),
      xbox: btn('xbox'),
      touchpad: btn('touchpad'),
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
    const now = Date.now();

    // Safety: Xbox/PS button always acts as Emergency Stop when driving
    if (btns.xbox && this.state.enabled) { this.emergencyStop(); return; }

    // Enable/Disable
    if (btns.start && !this.state.enabled && this.state.safetyConfirmed) {
      if (btns.lt) {
        this.remoteStart();
      } else {
        this.enable();
      }
    }
    if (btns.back && this.state.enabled) { this.disable(); }

    // Toggle Headlights (with debounce)
    if (btns.x && (now - this.lastButtonPress.x > 300)) {
      this.headlightsOn = !this.headlightsOn;
      this.lastButtonPress.x = now;
    }

    // Horn
    this.hornActive = btns.y;
  }

  private lastButtonPress = {
    x: 0,
    y: 0,
    a: 0,
    b: 0
  };

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

    // Horn
    if (this.hornActive) {
      commands.push(CAN_COMMANDS.FRM_HORN(true));
    }

    // Send all commands through native bridge
    try {
      await OBD2Bridge.sendCANCommands({ commands });
    } catch (e) {
      // Silent fail
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
    const stopCommands: CANCommand[] = [
      CAN_COMMANDS.DME_THROTTLE(0),
      CAN_COMMANDS.DME_THROTTLE2(0),
      CAN_COMMANDS.DSC_BRAKE(0),
      CAN_COMMANDS.AFS_STEERING(0),
      CAN_COMMANDS.SZL_OVERRIDE(false),
      CAN_COMMANDS.FRM_HORN(false),
    ];
    OBD2Bridge.sendCANCommands({ commands: stopCommands }).catch(() => {});
    this.emit();
  }

  emergencyStop() {
    this.state.enabled = false;
    if (this.controlLoop) { clearInterval(this.controlLoop); this.controlLoop = null; }
    OBD2Bridge.sendCANCommands({
      commands: [
        CAN_COMMANDS.DME_SHUTDOWN(),
        CAN_COMMANDS.CAS_IGNITION('off'),
      ],
    }).catch(() => {});
    this.emit();
  }

  async remoteStart() {
    if (this.state.isRemoteStarting) return;
    this.state.isRemoteStarting = true;
    this.emit();
    console.log('Initiating Remote Start sequence...');

    try {
      // 1. Emulate Key Present
      await OBD2Bridge.sendCANCommands({ commands: [CAN_COMMANDS.CAS_KEY_EMULATION(true)] });
      await new Promise(r => setTimeout(r, 800));

      // 2. Ignition ON (Terminal 15)
      await OBD2Bridge.sendCANCommands({ commands: [CAN_COMMANDS.CAS_IGNITION('on')] });
      await new Promise(r => setTimeout(r, 1200));

      // 3. Apply Brake + Starter (Terminal 50)
      // E60 requires brake signal for starter engagement on automatics
      const startSequence: CANCommand[] = [
        CAN_COMMANDS.DSC_BRAKE(100),
        CAN_COMMANDS.CAS_IGNITION('start')
      ];
      await OBD2Bridge.sendCANCommands({ commands: startSequence });

      // Hold starter for 1.8 seconds or until RPM detected
      await new Promise(r => setTimeout(r, 1800));

      // 4. Release Starter, keep Ignition ON
      await OBD2Bridge.sendCANCommands({
        commands: [
          CAN_COMMANDS.CAS_IGNITION('on'),
          CAN_COMMANDS.DSC_BRAKE(0)
        ]
      });

      this.enable(); // Auto-enable gamepad control after start
    } catch (e) {
      console.error('Remote start failed', e);
      this.emergencyStop();
    } finally {
      this.state.isRemoteStarting = false;
      this.emit();
    }
  }

  confirmSafety() {
    this.state.safetyConfirmed = true;
    this.emit();
  }

  // Settings & Custom Mappings
  setDeadzone(v: number) { this.state.deadzone = v; this.saveSettings(); this.emit(); }
  setSteeringSensitivity(v: number) { this.state.steeringSensitivity = v; this.saveSettings(); this.emit(); }
  setThrottleSensitivity(v: number) { this.state.throttleSensitivity = v; this.saveSettings(); this.emit(); }
  setBrakeSensitivity(v: number) { this.state.brakeSensitivity = v; this.saveSettings(); this.emit(); }
  setDriveMode(m: GamepadState['driveMode']) { this.state.driveMode = m; this.saveSettings(); this.emit(); }
  setInvertSteering(v: boolean) { this.state.invertSteering = v; this.saveSettings(); this.emit(); }

  setCustomMapping(mapping: GamepadMapping) {
    this.customMapping = mapping;
    this.state.customMappingEnabled = true;
    this.currentMapping = mapping;
    this.saveSettings();
    this.emit();
  }

  toggleCustomMapping(enabled: boolean) {
    this.state.customMappingEnabled = enabled;
    if (enabled && this.customMapping) {
      this.currentMapping = this.customMapping;
    } else {
      // Re-detect to set defaults
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (pad) {
          this.detectController(pad);
          break;
        }
      }
    }
    this.saveSettings();
    this.emit();
  }
}

export const gamepadManager = GamepadManager.getInstance();
