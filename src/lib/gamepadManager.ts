import type { GamepadMapping, GamepadState, GamepadAxes } from '@/types';

export { GamepadMapping, GamepadState, GamepadAxes };

const DEFAULT_MAPPINGS: Record<string, GamepadMapping> = {
  xbox: {
    buttons: {
      a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 6, start: 7,
      leftStickBtn: 8, rightStickBtn: 9, dpadUp: 12, dpadDown: 13,
      dpadLeft: 14, dpadRight: 15, xbox: 16, touchpad: 17,
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 3,
      leftTrigger: 4, rightTrigger: 5,
    },
  },
  playstation: {
    buttons: {
      a: 1, b: 2, x: 0, y: 3, lb: 4, rb: 5, back: 8, start: 9,
      leftStickBtn: 10, rightStickBtn: 11, dpadUp: 12, dpadDown: 13,
      dpadLeft: 14, dpadRight: 15, xbox: 16, touchpad: 17,
    },
    axes: {
      leftStickX: 0, leftStickY: 1, rightStickX: 2, rightStickY: 5,
      leftTrigger: 3, rightTrigger: 4,
    },
  },
};

export { DEFAULT_MAPPINGS };

export class GamepadManager {
  private static instance: GamepadManager;
  private state: GamepadState;
  private listeners: ((state: GamepadState) => void)[] = [];
  private currentMapping: GamepadMapping = DEFAULT_MAPPINGS.xbox;
  private customMapping: GamepadMapping | null = null;
  private rafId: number | null = null;

  static getInstance(): GamepadManager {
    if (!GamepadManager.instance) {
      GamepadManager.instance = new GamepadManager();
    }
    return GamepadManager.instance;
  }

  private constructor() {
    this.state = {
      connected: false,
      enabled: false,
      controllerType: 'xbox',
      controllerName: '',
      axes: { leftStickX: 0, leftStickY: 0, rightStickX: 0, rightStickY: 0, leftTrigger: 0, rightTrigger: 0 },
      buttons: { a: false, b: false, x: false, y: false, lb: false, rb: false, lt: false, rt: false, back: false, start: false, dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false, leftStickBtn: false, rightStickBtn: false, xbox: false, touchpad: false },
      deadzone: 0.1,
      steeringSensitivity: 1.0,
      throttleSensitivity: 1.0,
      brakeSensitivity: 1.0,
      driveMode: 'sport',
      invertSteering: false,
      safetyConfirmed: false,
      isRemoteStarting: false,
      lastUpdate: 0,
      customMappingEnabled: false,
    };
    this.loadSettings();
  }

  getState(): GamepadState { return { ...this.state }; }

  subscribe(callback: (state: GamepadState) => void): () => void {
    this.listeners.push(callback);
    callback(this.getState());
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  getCustomMapping(): GamepadMapping | null { return this.customMapping; }
  getDefaultMapping(): GamepadMapping { return this.currentMapping; }

  private emit() {
    const s = this.getState();
    this.listeners.forEach(l => l(s));
  }

  enable() {
    this.state.enabled = true;
    this.startPolling();
    this.emit();
  }

  disable() {
    this.state.enabled = false;
    this.stopPolling();
    this.emit();
  }

  private startPolling() {
    if (this.rafId !== null) return;
    const poll = () => {
      this.pollGamepads();
      this.rafId = requestAnimationFrame(poll);
    };
    this.rafId = requestAnimationFrame(poll);
  }

  private stopPolling() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let found = false;
    for (const pad of pads) {
      if (pad) {
        found = true;
        this.state.connected = true;
        this.state.controllerName = pad.id;
        this.detectController(pad);
        this.applyMapping(pad);
        break;
      }
    }
    if (!found && this.state.connected) {
      this.state.connected = false;
      this.state.controllerName = '';
    }
    this.state.lastUpdate = Date.now();
    this.emit();
  }

  private detectController(pad: Gamepad) {
    const id = pad.id.toLowerCase();
    if (id.includes('xbox') || id.includes('microsoft')) {
      this.state.controllerType = 'xbox';
      this.currentMapping = DEFAULT_MAPPINGS.xbox;
    } else if (id.includes('playstation') || id.includes('sony') || id.includes('dualshock') || id.includes('dualsense')) {
      this.state.controllerType = 'playstation';
      this.currentMapping = DEFAULT_MAPPINGS.playstation;
    }
  }

  private applyMapping(pad: Gamepad) {
    const map = this.state.customMappingEnabled && this.customMapping ? this.customMapping : this.currentMapping;
    if (!map) return;

    for (const [key, idx] of Object.entries(map.buttons)) {
      if (typeof idx === 'number' && pad.buttons[idx]) {
        (this.state.buttons as any)[key] = pad.buttons[idx].pressed;
      }
    }
    for (const [key, idx] of Object.entries(map.axes)) {
      if (typeof idx === 'number' && pad.axes[idx] !== undefined) {
        let val = pad.axes[idx];
        if (Math.abs(val) < this.state.deadzone) val = 0;
        (this.state.axes as any)[key] = val;
      }
    }
  }

  setDeadzone(value: number) {
    this.state.deadzone = Math.max(0, Math.min(1, value));
    this.saveSettings();
    this.emit();
  }

  setSensitivity(axis: 'steering' | 'throttle' | 'brake', value: number) {
    const key = axis + 'Sensitivity' as 'steeringSensitivity' | 'throttleSensitivity' | 'brakeSensitivity';
    (this.state as any)[key] = Math.max(0.1, Math.min(3, value));
    this.saveSettings();
    this.emit();
  }

  setDriveMode(mode: 'sport' | 'comfort' | 'eco' | 'track') {
    this.state.driveMode = mode;
    this.saveSettings();
    this.emit();
  }

  toggleInvertSteering() {
    this.state.invertSteering = !this.state.invertSteering;
    this.saveSettings();
    this.emit();
  }

  confirmSafety() {
    this.state.safetyConfirmed = true;
    this.emit();
  }

  setCustomMapping(mapping: GamepadMapping) {
    this.customMapping = mapping;
    this.state.customMappingEnabled = true;
    this.saveSettings();
    this.emit();
  }

  toggleCustomMapping(enabled: boolean) {
    this.state.customMappingEnabled = enabled;
    if (enabled && this.customMapping) {
      this.currentMapping = this.customMapping;
    } else {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (pad) { this.detectController(pad); break; }
      }
    }
    this.saveSettings();
    this.emit();
  }

  private saveSettings() {
    try {
      localStorage.setItem('gamepadSettings', JSON.stringify({
        deadzone: this.state.deadzone,
        steeringSensitivity: this.state.steeringSensitivity,
        throttleSensitivity: this.state.throttleSensitivity,
        brakeSensitivity: this.state.brakeSensitivity,
        driveMode: this.state.driveMode,
        invertSteering: this.state.invertSteering,
        customMappingEnabled: this.state.customMappingEnabled,
        customMapping: this.customMapping,
      }));
    } catch {}
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem('gamepadSettings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.deadzone !== undefined) this.state.deadzone = s.deadzone;
        if (s.steeringSensitivity !== undefined) this.state.steeringSensitivity = s.steeringSensitivity;
        if (s.throttleSensitivity !== undefined) this.state.throttleSensitivity = s.throttleSensitivity;
        if (s.brakeSensitivity !== undefined) this.state.brakeSensitivity = s.brakeSensitivity;
        if (s.driveMode) this.state.driveMode = s.driveMode;
        if (s.invertSteering !== undefined) this.state.invertSteering = s.invertSteering;
        if (s.customMappingEnabled !== undefined) this.state.customMappingEnabled = s.customMappingEnabled;
        if (s.customMapping) this.customMapping = s.customMapping;
      }
    } catch {}
  }

  startScanning() { this.enable(); }
  stopScanning() { this.disable(); }
  emergencyStop() { this.state.isRemoteStarting = false; this.emit(); }
  setSteeringSensitivity(value: number) { this.setSensitivity('steering', value); }
  setThrottleSensitivity(value: number) { this.setSensitivity('throttle', value); }
  setBrakeSensitivity(value: number) { this.setSensitivity('brake', value); }
}

export const gamepadManager = GamepadManager.getInstance();
