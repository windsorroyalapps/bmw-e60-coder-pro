// BMW E60 Coder Pro - Live Tuning Engine
// Real-time parameter adjustment via UDS WriteDataByIdentifier (0x2E)
// 23 tunable parameters across 7 categories

export interface TuningParameter {
  id: string;
  name: string;
  category: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
  currentValue: number;
  pendingValue: number;
  ecuAddress: string;
  dataIdentifier: string;
  isDangerous: boolean;
  requiresRestart: boolean;
}

export interface TuningAction {
  id: string;
  timestamp: number;
  parameterId: string;
  oldValue: number;
  newValue: number;
  applied: boolean;
}

interface LiveTuningState {
  parameters: TuningParameter[];
  history: TuningAction[];
  undoStack: TuningAction[];
  redoStack: TuningAction[];
  isApplying: boolean;
  lastError: string | null;
  engineRunning: boolean;
}

const DEFAULT_PARAMETERS: TuningParameter[] = [
  // === TIMING (4 params) ===
  {
    id: 'timing_global', name: 'Global Timing Offset', category: 'timing',
    description: 'Add/subtract timing across all RPM/load points',
    min: -10, max: 10, step: 0.5, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF101',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'timing_low_load', name: 'Low Load Timing', category: 'timing',
    description: 'Ignition advance at low load (<40%)',
    min: -5, max: 8, step: 0.5, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF102',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'timing_high_load', name: 'High Load Timing', category: 'timing',
    description: 'Ignition advance at high load (>60%)',
    min: -5, max: 6, step: 0.5, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF103',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'timing_wot', name: 'WOT Timing', category: 'timing',
    description: 'Ignition advance at wide open throttle',
    min: -3, max: 5, step: 0.5, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF104',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'knock_retard_max', name: 'Max Knock Retard', category: 'timing',
    description: 'Maximum timing pull on knock detection',
    min: 0, max: 12, step: 0.5, unit: '°',
    defaultValue: 8, currentValue: 8, pendingValue: 8,
    ecuAddress: '0x12', dataIdentifier: '0xF105',
    isDangerous: false, requiresRestart: false,
  },
  // === FUEL (4 params) ===
  {
    id: 'fuel_correction', name: 'Global Fuel Correction', category: 'fuel',
    description: 'Add/subtract fuel across all cells',
    min: -20, max: 20, step: 1, unit: '%',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF201',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'fuel_wot', name: 'WOT Fuel Enrichment', category: 'fuel',
    description: 'Additional fuel at wide open throttle',
    min: -10, max: 15, step: 1, unit: '%',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF202',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'fuel_startup', name: 'Startup Enrichment', category: 'fuel',
    description: 'Extra fuel on cold startup',
    min: -20, max: 30, step: 5, unit: '%',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF203',
    isDangerous: false, requiresRestart: true,
  },
  {
    id: 'injector_deadtime', name: 'Injector Deadtime', category: 'fuel',
    description: 'Voltage-compensated injector latency',
    min: 0.5, max: 2.0, step: 0.05, unit: 'ms',
    defaultValue: 1.0, currentValue: 1.0, pendingValue: 1.0,
    ecuAddress: '0x12', dataIdentifier: '0xF204',
    isDangerous: false, requiresRestart: false,
  },
  // === BOOST (4 params) ===
  {
    id: 'boost_target', name: 'Boost Target', category: 'boost',
    description: 'Target boost pressure (turbo engines only)',
    min: 0.3, max: 2.5, step: 0.05, unit: 'bar',
    defaultValue: 0.8, currentValue: 0.8, pendingValue: 0.8,
    ecuAddress: '0x12', dataIdentifier: '0xF301',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'boost_taper_start', name: 'Boost Taper Start RPM', category: 'boost',
    description: 'RPM where boost begins to taper',
    min: 4000, max: 7000, step: 100, unit: 'RPM',
    defaultValue: 5500, currentValue: 5500, pendingValue: 5500,
    ecuAddress: '0x12', dataIdentifier: '0xF302',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'boost_taper_end', name: 'Boost Taper End RPM', category: 'boost',
    description: 'RPM where boost reaches minimum',
    min: 5000, max: 7500, step: 100, unit: 'RPM',
    defaultValue: 6500, currentValue: 6500, pendingValue: 6500,
    ecuAddress: '0x12', dataIdentifier: '0xF303',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'wastegate_duty', name: 'Wastegate Duty Offset', category: 'boost',
    description: 'Add/subtract from base WG duty cycle',
    min: -20, max: 20, step: 1, unit: '%',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF304',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'wg_preload', name: 'Wastegate Preload', category: 'boost',
    description: 'Mechanical WG actuator preload',
    min: 0, max: 1.5, step: 0.05, unit: 'bar',
    defaultValue: 0.3, currentValue: 0.3, pendingValue: 0.3,
    ecuAddress: '0x12', dataIdentifier: '0xF305',
    isDangerous: false, requiresRestart: false,
  },
  // === IDLE (2 params) ===
  {
    id: 'idle_rpm', name: 'Idle RPM Target', category: 'idle',
    description: 'Target idle speed',
    min: 600, max: 1200, step: 25, unit: 'RPM',
    defaultValue: 700, currentValue: 700, pendingValue: 700,
    ecuAddress: '0x12', dataIdentifier: '0xF401',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'idle_lean', name: 'Idle Lambda', category: 'idle',
    description: 'Target lambda at idle (lower = richer)',
    min: 0.85, max: 1.05, step: 0.01, unit: 'λ',
    defaultValue: 0.95, currentValue: 0.95, pendingValue: 0.95,
    ecuAddress: '0x12', dataIdentifier: '0xF402',
    isDangerous: false, requiresRestart: false,
  },
  // === LIMITS (4 params) ===
  {
    id: 'rev_limit_soft', name: 'Soft Rev Limit', category: 'limits',
    description: 'RPM where soft cut begins',
    min: 5000, max: 8000, step: 100, unit: 'RPM',
    defaultValue: 7000, currentValue: 7000, pendingValue: 7000,
    ecuAddress: '0x12', dataIdentifier: '0xF501',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'rev_limit_hard', name: 'Hard Rev Limit', category: 'limits',
    description: 'RPM where fuel cut occurs',
    min: 5500, max: 8500, step: 100, unit: 'RPM',
    defaultValue: 7200, currentValue: 7200, pendingValue: 7200,
    ecuAddress: '0x12', dataIdentifier: '0xF502',
    isDangerous: true, requiresRestart: false,
  },
  {
    id: 'speed_limit', name: 'Speed Limit', category: 'limits',
    description: 'Maximum vehicle speed (0 = unlimited)',
    min: 0, max: 350, step: 5, unit: 'km/h',
    defaultValue: 250, currentValue: 250, pendingValue: 250,
    ecuAddress: '0x12', dataIdentifier: '0xF503',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'torque_limit', name: 'Torque Limit', category: 'limits',
    description: 'Maximum engine torque output',
    min: 300, max: 900, step: 10, unit: 'Nm',
    defaultValue: 600, currentValue: 600, pendingValue: 600,
    ecuAddress: '0x12', dataIdentifier: '0xF504',
    isDangerous: true, requiresRestart: false,
  },
  // === VANOS (2 params) ===
  {
    id: 'vanos_intake', name: 'VANOS Intake Offset', category: 'vanos',
    description: 'Add/subtract intake cam advance',
    min: -10, max: 10, step: 1, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF601',
    isDangerous: false, requiresRestart: false,
  },
  {
    id: 'vanos_exhaust', name: 'VANOS Exhaust Offset', category: 'vanos',
    description: 'Add/subtract exhaust cam advance',
    min: -10, max: 10, step: 1, unit: '°',
    defaultValue: 0, currentValue: 0, pendingValue: 0,
    ecuAddress: '0x12', dataIdentifier: '0xF602',
    isDangerous: false, requiresRestart: false,
  },
  // === THROTTLE (1 param) ===
  {
    id: 'throttle_sensitivity', name: 'Throttle Sensitivity', category: 'throttle',
    description: 'Pedal response curve aggressiveness',
    min: 50, max: 150, step: 5, unit: '%',
    defaultValue: 100, currentValue: 100, pendingValue: 100,
    ecuAddress: '0x12', dataIdentifier: '0xF701',
    isDangerous: false, requiresRestart: false,
  },
];

class LiveTuningEngine {
  private state: LiveTuningState = {
    parameters: JSON.parse(JSON.stringify(DEFAULT_PARAMETERS)),
    history: [],
    undoStack: [],
    redoStack: [],
    isApplying: false,
    lastError: null,
    engineRunning: false,
  };

  private listeners: ((state: LiveTuningState) => void)[] = [];
  private applyTimer: ReturnType<typeof setTimeout> | null = null;

  private emit() {
    this.listeners.forEach(l => l(this.state));
  }

  subscribe(callback: (state: LiveTuningState) => void) {
    this.listeners.push(callback);
    callback(this.state);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  getState(): LiveTuningState {
    return { ...this.state, parameters: this.state.parameters.map(p => ({ ...p })) };
  }

  getParameters(): TuningParameter[] {
    return this.state.parameters.map(p => ({ ...p }));
  }

  getParameter(id: string): TuningParameter | undefined {
    return this.state.parameters.find(p => p.id === id);
  }

  getCategories(): string[] {
    return [...new Set(this.state.parameters.map(p => p.category))];
  }

  getParametersByCategory(category: string): TuningParameter[] {
    return this.state.parameters.filter(p => p.category === category).map(p => ({ ...p }));
  }

  /**
   * Set a parameter's pending value (not yet applied to ECU)
   */
  setParameterValue(id: string, value: number): boolean {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;

    const clamped = Math.max(param.min, Math.min(param.max, value));
    param.pendingValue = Math.round(clamped / param.step) * param.step;

    this.emit();
    return true;
  }

  /**
   * Adjust a parameter by step (used by +/- buttons)
   */
  adjustParameter(id: string, direction: 1 | -1): boolean {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;

    const newValue = param.pendingValue + (param.step * direction);
    return this.setParameterValue(id, newValue);
  }

  /**
   * Apply a single parameter to the ECU via UDS
   */
  async applyParameter(id: string): Promise<boolean> {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;
    if (param.pendingValue === param.currentValue) return true;

    this.state.isApplying = true;
    this.emit();

    try {
      // In real implementation, this would call OBD2Bridge.writeDataByIdentifier()
      // For now, we simulate the UDS write
      await this.sendUDSWrite(param.ecuAddress, param.dataIdentifier, param.pendingValue);

      const oldValue = param.currentValue;
      param.currentValue = param.pendingValue;

      const action: TuningAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        parameterId: id,
        oldValue,
        newValue: param.pendingValue,
        applied: true,
      };

      this.state.history.push(action);
      this.state.undoStack.push(action);
      this.state.redoStack = []; // Clear redo on new action
      this.state.lastError = null;

      return true;
    } catch (err) {
      this.state.lastError = `Failed to apply ${param.name}: ${err}`;
      return false;
    } finally {
      this.state.isApplying = false;
      this.emit();
    }
  }

  /**
   * Apply all pending changes
   */
  async applyAll(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const param of this.state.parameters) {
      if (param.pendingValue !== param.currentValue) {
        const ok = await this.applyParameter(param.id);
        if (ok) success++;
        else failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Revert a single parameter to its current (ECU) value
   */
  revertParameter(id: string): boolean {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;
    param.pendingValue = param.currentValue;
    this.emit();
    return true;
  }

  /**
   * Revert all parameters to their current (ECU) values
   */
  revertAll(): void {
    this.state.parameters.forEach(p => { p.pendingValue = p.currentValue; });
    this.emit();
  }

  /**
   * Reset a parameter to factory default
   */
  resetParameter(id: string): boolean {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;
    param.pendingValue = param.defaultValue;
    this.emit();
    return true;
  }

  /**
   * Reset all parameters to factory defaults
   */
  resetAll(): void {
    this.state.parameters.forEach(p => { p.pendingValue = p.defaultValue; });
    this.emit();
  }

  /**
   * Undo the last applied change
   */
  async undo(): Promise<boolean> {
    const action = this.state.undoStack.pop();
    if (!action) return false;

    const param = this.state.parameters.find(p => p.id === action.parameterId);
    if (!param) return false;

    param.pendingValue = action.oldValue;
    await this.applyParameter(action.parameterId);
    this.state.redoStack.push(action);

    return true;
  }

  /**
   * Redo the last undone change
   */
  async redo(): Promise<boolean> {
    const action = this.state.redoStack.pop();
    if (!action) return false;

    const param = this.state.parameters.find(p => p.id === action.parameterId);
    if (!param) return false;

    param.pendingValue = action.newValue;
    await this.applyParameter(action.parameterId);
    this.state.undoStack.push(action);

    return true;
  }

  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  /**
   * Check if any parameter has pending changes
   */
  hasPendingChanges(): boolean {
    return this.state.parameters.some(p => p.pendingValue !== p.currentValue);
  }

  /**
   * Get pending changes summary
   */
  getPendingChanges(): { id: string; name: string; oldValue: number; newValue: number; unit: string }[] {
    return this.state.parameters
      .filter(p => p.pendingValue !== p.currentValue)
      .map(p => ({
        id: p.id,
        name: p.name,
        oldValue: p.currentValue,
        newValue: p.pendingValue,
        unit: p.unit,
      }));
  }

  /**
   * Check if a parameter change is dangerous
   */
  isDangerous(id: string): boolean {
    const param = this.state.parameters.find(p => p.id === id);
    if (!param) return false;
    return param.isDangerous && param.pendingValue !== param.currentValue;
  }

  /**
   * Check if any pending change is dangerous
   */
  hasDangerousChanges(): boolean {
    return this.state.parameters.some(p => p.isDangerous && p.pendingValue !== p.currentValue);
  }

  /**
   * Set engine running state
   */
  setEngineRunning(running: boolean): void {
    this.state.engineRunning = running;
    this.emit();
  }

  /**
   * Schedule auto-apply after a delay (debounced)
   */
  scheduleApply(delayMs: number = 500): void {
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.applyTimer = setTimeout(() => {
      this.applyAll();
    }, delayMs);
  }

  cancelScheduledApply(): void {
    if (this.applyTimer) {
      clearTimeout(this.applyTimer);
      this.applyTimer = null;
    }
  }

  /**
   * Simulated UDS WriteDataByIdentifier
   * In the real implementation, this calls OBD2Bridge.udsWrite()
   */
  private async sendUDSWrite(_ecuAddress: string, _dataId: string, _value: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // 95% success rate simulation
        if (Math.random() > 0.05) {
          resolve();
        } else {
          reject(new Error('UDS NRC 0x78 - responsePending'));
        }
      }, 50);
    });
  }

  /**
   * Get category display info
   */
  getCategoryInfo(category: string): { icon: string; color: string; description: string } {
    const info: Record<string, { icon: string; color: string; description: string }> = {
      timing: { icon: 'Zap', color: 'text-yellow-400', description: 'Ignition timing adjustments' },
      fuel: { icon: 'Fuel', color: 'text-blue-400', description: 'Fuel delivery and corrections' },
      boost: { icon: 'TrendingUp', color: 'text-orange-400', description: 'Turbo boost control' },
      idle: { icon: 'CircleDot', color: 'text-green-400', description: 'Idle speed and mixture' },
      limits: { icon: 'Shield', color: 'text-red-400', description: 'Safety limits and cutoffs' },
      vanos: { icon: 'Settings', color: 'text-purple-400', description: 'Variable valve timing' },
      throttle: { icon: 'Gauge', color: 'text-pink-400', description: 'Throttle response' },
    };
    return info[category] || { icon: 'Settings', color: 'text-gray-400', description: '' };
  }
}

export const liveTuningEngine = new LiveTuningEngine();
export type { LiveTuningState };
export default liveTuningEngine;
