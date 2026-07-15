// BMW E60 Coder Pro - Live Tuning Engine
// Real-time parameter adjustment while engine is running.
// Uses UDS WriteDataByIdentifier (SID 0x2E) to change DME parameters on the fly.
// All changes are validated against safety limits before being sent.

import { OBD2Bridge } from './nativeBridge';

export type LiveParameterCategory = 'timing' | 'fuel' | 'boost' | 'idle' | 'limits' | 'vanos' | 'throttle';

export interface LiveParameter {
  id: string;
  name: string;
  category: LiveParameterCategory;
  description: string;
  unit: string;
  // Current value from ECU
  currentValue: number;
  // Pending value (user adjusted but not yet applied)
  pendingValue: number;
  // Safe range for this engine
  min: number;
  max: number;
  // Default/stock value
  defaultValue: number;
  // Step size for adjustment
  step: number;
  // Safety multiplier - if exceeded, warn user
  dangerMultiplier: number;
  // Whether this parameter can be changed while engine is running
  liveEditable: boolean;
  // DME data identifier for UDS write
  dataIdentifier: string;
  // Last write status
  lastWriteStatus: 'none' | 'pending' | 'success' | 'error';
  lastWriteError?: string;
}

export interface LiveTuningState {
  isActive: boolean;
  parameters: Record<string, LiveParameter>;
  hasPendingChanges: boolean;
  writeInProgress: boolean;
  lastWriteTime: number;
  undoStack: TuningAction[];
  redoStack: TuningAction[];
  engineRunning: boolean;
}

export interface TuningAction {
  parameterId: string;
  previousValue: number;
  newValue: number;
  timestamp: number;
}

// N54-specific parameter definitions
export const N54_PARAMETERS: Omit<LiveParameter, 'currentValue' | 'pendingValue' | 'lastWriteStatus'>[] = [
  // TIMING
  { id: 'timing_global', name: 'Global Timing', category: 'timing', description: 'Global ignition timing advance offset', unit: 'deg', min: -5, max: 5, defaultValue: 0, step: 0.5, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2801' },
  { id: 'timing_low_load', name: 'Low Load Timing', category: 'timing', description: 'Timing advance at low load (<50%)', unit: 'deg', min: -3, max: 3, defaultValue: 0, step: 0.5, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2802' },
  { id: 'timing_high_load', name: 'High Load Timing', category: 'timing', description: 'Timing advance at high load (>70%)', unit: 'deg', min: -5, max: 3, defaultValue: 0, step: 0.5, dangerMultiplier: 1.3, liveEditable: true, dataIdentifier: '2803' },
  { id: 'timing_wot', name: 'WOT Timing', category: 'timing', description: 'Timing at wide open throttle', unit: 'deg', min: -8, max: 2, defaultValue: 0, step: 0.5, dangerMultiplier: 1.2, liveEditable: true, dataIdentifier: '2804' },
  { id: 'knock_retard_max', name: 'Max Knock Retard', category: 'timing', description: 'Maximum timing retard on knock', unit: 'deg', min: 0, max: 10, defaultValue: 6, step: 0.5, dangerMultiplier: 2, liveEditable: true, dataIdentifier: '2805' },

  // FUEL
  { id: 'fuel_correction', name: 'Fuel Correction', category: 'fuel', description: 'Global fuel trim correction', unit: '%', min: -20, max: 20, defaultValue: 0, step: 1, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2806' },
  { id: 'fuel_wot', name: 'WOT Enrichment', category: 'fuel', description: 'Additional enrichment at WOT', unit: '%', min: 0, max: 25, defaultValue: 0, step: 1, dangerMultiplier: 1.3, liveEditable: true, dataIdentifier: '2807' },
  { id: 'fuel_startup', name: 'Startup Enrichment', category: 'fuel', description: 'Cold start enrichment factor', unit: '%', min: 80, max: 150, defaultValue: 100, step: 5, dangerMultiplier: 1.5, liveEditable: false, dataIdentifier: '2808' },
  { id: 'injector_deadtime', name: 'Injector Deadtime', category: 'fuel', description: 'Injector opening delay compensation', unit: 'ms', min: 0.5, max: 2.0, defaultValue: 1.0, step: 0.05, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2809' },

  // BOOST
  { id: 'boost_target', name: 'Boost Target', category: 'boost', description: 'Target boost pressure', unit: 'bar', min: 0.3, max: 2.2, defaultValue: 0.8, step: 0.05, dangerMultiplier: 1.1, liveEditable: true, dataIdentifier: '280A' },
  { id: 'boost_taper_start', name: 'Boost Taper Start', category: 'boost', description: 'RPM where boost taper begins', unit: 'RPM', min: 4500, max: 6500, defaultValue: 5500, step: 100, dangerMultiplier: 1.2, liveEditable: true, dataIdentifier: '280B' },
  { id: 'boost_taper_end', name: 'Boost Taper End', category: 'boost', description: 'RPM where boost reaches minimum', unit: 'RPM', min: 5500, max: 7500, defaultValue: 7000, step: 100, dangerMultiplier: 1.2, liveEditable: true, dataIdentifier: '280C' },
  { id: 'wastegate_duty', name: 'WG Duty Max', category: 'boost', description: 'Maximum wastegate duty cycle', unit: '%', min: 50, max: 95, defaultValue: 85, step: 1, dangerMultiplier: 1.1, liveEditable: true, dataIdentifier: '280D' },
  { id: 'wg_preload', name: 'WG Preload', category: 'boost', description: 'Wastegate preload pressure', unit: 'bar', min: 0.2, max: 0.8, defaultValue: 0.5, step: 0.05, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '280E' },

  // IDLE
  { id: 'idle_rpm', name: 'Idle RPM', category: 'idle', description: 'Target idle speed', unit: 'RPM', min: 600, max: 1000, defaultValue: 700, step: 25, dangerMultiplier: 1.3, liveEditable: true, dataIdentifier: '280F' },
  { id: 'idle_lean', name: 'Idle Lambda', category: 'idle', description: 'Idle air-fuel ratio target', unit: 'lambda', min: 0.85, max: 1.05, defaultValue: 1.0, step: 0.01, dangerMultiplier: 1.1, liveEditable: true, dataIdentifier: '2810' },

  // LIMITS
  { id: 'rev_limit_soft', name: 'Soft Rev Limit', category: 'limits', description: 'Soft RPM limit (fuel cut begins)', unit: 'RPM', min: 5500, max: 8000, defaultValue: 7000, step: 50, dangerMultiplier: 1.1, liveEditable: true, dataIdentifier: '2811' },
  { id: 'rev_limit_hard', name: 'Hard Rev Limit', category: 'limits', description: 'Hard RPM limit (hard fuel cut)', unit: 'RPM', min: 6000, max: 8500, defaultValue: 7200, step: 50, dangerMultiplier: 1.1, liveEditable: true, dataIdentifier: '2812' },
  { id: 'speed_limit', name: 'Speed Limit', category: 'limits', description: 'Vehicle speed limiter', unit: 'km/h', min: 0, max: 320, defaultValue: 250, step: 10, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2813' },
  { id: 'torque_limit', name: 'Torque Limit', category: 'limits', description: 'Maximum engine torque limit', unit: 'Nm', min: 200, max: 800, defaultValue: 600, step: 10, dangerMultiplier: 1.2, liveEditable: true, dataIdentifier: '2814' },

  // VANOS
  { id: 'vanos_intake', name: 'VANOS Intake', category: 'vanos', description: 'Intake cam advance offset', unit: 'deg', min: -10, max: 10, defaultValue: 0, step: 1, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2815' },
  { id: 'vanos_exhaust', name: 'VANOS Exhaust', category: 'vanos', description: 'Exhaust cam advance offset', unit: 'deg', min: -10, max: 10, defaultValue: 0, step: 1, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2816' },

  // THROTTLE
  { id: 'throttle_sensitivity', name: 'Throttle Sens.', category: 'throttle', description: 'Electronic throttle sensitivity', unit: '%', min: 50, max: 150, defaultValue: 100, step: 5, dangerMultiplier: 1.5, liveEditable: true, dataIdentifier: '2817' },
];

class LiveTuningEngine {
  private parameters: Record<string, LiveParameter> = {};
  private undoStack: TuningAction[] = [];
  private redoStack: TuningAction[] = [];
  private isActive = false;
  private writeInProgress = false;
  private lastWriteTime = 0;

  initialize(engine: string) {
    const defs = engine === 'n54' ? N54_PARAMETERS : N54_PARAMETERS; // Default to N54
    this.parameters = {};
    for (const def of defs) {
      this.parameters[def.id] = {
        ...def,
        currentValue: def.defaultValue,
        pendingValue: def.defaultValue,
        lastWriteStatus: 'none',
      };
    }
    this.undoStack = [];
    this.redoStack = [];
    this.isActive = true;
  }

  getState(): LiveTuningState {
    const hasPending = Object.values(this.parameters).some(p => p.pendingValue !== p.currentValue);
    return {
      isActive: this.isActive,
      parameters: { ...this.parameters },
      hasPendingChanges: hasPending,
      writeInProgress: this.writeInProgress,
      lastWriteTime: this.lastWriteTime,
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      engineRunning: false,
    };
  }

  /**
   * Adjust a parameter's pending value
   */
  adjustParameter(id: string, direction: 'up' | 'down'): boolean {
    const param = this.parameters[id];
    if (!param || !param.liveEditable) return false;

    const newValue = direction === 'up'
      ? param.pendingValue + param.step
      : param.pendingValue - param.step;

    // Clamp to safe range
    param.pendingValue = Math.max(param.min, Math.min(param.max, newValue));
    return true;
  }

  setParameterValue(id: string, value: number): boolean {
    const param = this.parameters[id];
    if (!param || !param.liveEditable) return false;
    param.pendingValue = Math.max(param.min, Math.min(param.max, value));
    return true;
  }

  /**
   * Apply a single parameter change to the DME
   */
  async applyParameter(id: string): Promise<boolean> {
    const param = this.parameters[id];
    if (!param || param.pendingValue === param.currentValue) return false;

    this.writeInProgress = true;
    param.lastWriteStatus = 'pending';

    try {
      const result = await OBD2Bridge.writeDMEParameter({
        parameter: param.dataIdentifier,
        value: param.pendingValue,
      });

      if (result.success) {
        // Record for undo
        this.undoStack.push({
          parameterId: id,
          previousValue: param.currentValue,
          newValue: param.pendingValue,
          timestamp: Date.now(),
        });
        this.redoStack = []; // Clear redo on new action

        param.currentValue = param.pendingValue;
        param.lastWriteStatus = 'success';
        this.lastWriteTime = Date.now();
        this.writeInProgress = false;
        return true;
      } else {
        param.lastWriteStatus = 'error';
        param.lastWriteError = 'Write rejected by DME';
        // Revert pending to current
        param.pendingValue = param.currentValue;
        this.writeInProgress = false;
        return false;
      }
    } catch (e) {
      param.lastWriteStatus = 'error';
      param.lastWriteError = (e as Error).message;
      param.pendingValue = param.currentValue;
      this.writeInProgress = false;
      return false;
    }
  }

  /**
   * Apply all pending changes
   */
  async applyAll(): Promise<{ applied: string[]; failed: string[] }> {
    const applied: string[] = [];
    const failed: string[] = [];

    for (const [id, param] of Object.entries(this.parameters)) {
      if (param.pendingValue !== param.currentValue) {
        const ok = await this.applyParameter(id);
        if (ok) applied.push(id);
        else failed.push(id);
      }
    }

    return { applied, failed };
  }

  /**
   * Revert a parameter to its current (ECU) value
   */
  revertParameter(id: string) {
    const param = this.parameters[id];
    if (param) {
      param.pendingValue = param.currentValue;
      param.lastWriteStatus = 'none';
    }
  }

  /**
   * Revert all parameters to ECU values
   */
  revertAll() {
    for (const param of Object.values(this.parameters)) {
      param.pendingValue = param.currentValue;
      param.lastWriteStatus = 'none';
    }
  }

  /**
   * Reset a parameter to stock/default
   */
  resetToDefault(id: string) {
    const param = this.parameters[id];
    if (param) {
      param.pendingValue = param.defaultValue;
    }
  }

  /**
   * Reset all parameters to stock
   */
  resetAllToDefault() {
    for (const param of Object.values(this.parameters)) {
      param.pendingValue = param.defaultValue;
    }
  }

  /**
   * Undo last change
   */
  undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;

    const param = this.parameters[action.parameterId];
    if (param) {
      this.redoStack.push({
        parameterId: action.parameterId,
        previousValue: action.newValue,
        newValue: action.previousValue,
        timestamp: Date.now(),
      });
      param.pendingValue = action.previousValue;
      // Actually write the undo value
      this.applyParameter(action.parameterId);
    }
    return true;
  }

  /**
   * Redo last undone change
   */
  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    const param = this.parameters[action.parameterId];
    if (param) {
      param.pendingValue = action.newValue;
      this.applyParameter(action.parameterId);
    }
    return true;
  }

  /**
   * Get parameters grouped by category
   */
  getByCategory(): Record<LiveParameterCategory, LiveParameter[]> {
    const groups: Record<string, LiveParameter[]> = {
      timing: [], fuel: [], boost: [], idle: [], limits: [], vanos: [], throttle: [],
    };
    for (const param of Object.values(this.parameters)) {
      groups[param.category].push(param);
    }
    return groups as Record<LiveParameterCategory, LiveParameter[]>;
  }

  /**
   * Check if a parameter is at a dangerous level
   */
  isDangerous(id: string): boolean {
    const param = this.parameters[id];
    if (!param) return false;
    const range = param.max - param.min;
    const dangerThreshold = param.min + (range * param.dangerMultiplier / (param.dangerMultiplier + 1));
    if (param.pendingValue > param.max * 0.95) return true;
    if (param.pendingValue < dangerThreshold && param.dangerMultiplier < 2) return true;
    return false;
  }

  /**
   * Get count of dangerous parameters
   */
  getDangerCount(): number {
    return Object.keys(this.parameters).filter(id => this.isDangerous(id)).length;
  }

  shutdown() {
    this.isActive = false;
    this.parameters = {};
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const liveTuningEngine = new LiveTuningEngine();
