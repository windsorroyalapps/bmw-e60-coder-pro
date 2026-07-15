// BMW E60 Coder Pro - AI Live Tuning Service
// Bridges Gemini AI analysis with live tuning parameters
// Provides real-time AI-suggested parameter adjustments based on OBD2 data

import { analyzeLiveData } from './geminiAiService';
import { liveTuningEngine } from './liveTuningEngine';

export interface AiTuningSuggestion {
  parameterId: string;
  parameterName: string;
  category: string;
  currentValue: number;
  suggestedValue: number;
  delta: number;
  unit: string;
  reason: string;
  confidence: number;
  isSafe: boolean;
  safetyImpact: 'safe' | 'moderate' | 'risky';
}

export interface AiLiveTuningState {
  enabled: boolean;
  autoApply: boolean;
  suggestions: AiTuningSuggestion[];
  lastAnalysisTime: number;
  analyzing: boolean;
  lastError: string | null;
  consecutiveUnsafe: number;
  totalAdjustments: number;
  engineRunning: boolean;
}

const ANALYSIS_INTERVAL_MS = 3000;

class AiLiveTuningService {
  private state: AiLiveTuningState = {
    enabled: false,
    autoApply: false,
    suggestions: [],
    lastAnalysisTime: 0,
    analyzing: false,
    lastError: null,
    consecutiveUnsafe: 0,
    totalAdjustments: 0,
    engineRunning: false,
  };

  private listeners: ((state: AiLiveTuningState) => void)[] = [];
  private liveDataCache: Record<string, number> = {};
  private engineType: string = 'n54';
  private currentMap: string = 'stock';
  private modifications: string[] = [];

  private emit() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  subscribe(callback: (state: AiLiveTuningState) => void) {
    this.listeners.push(callback);
    callback({ ...this.state });
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  getState(): AiLiveTuningState {
    return { ...this.state };
  }

  /**
   * Enable/disable AI live tuning
   */
  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    if (enabled) {
      this.startAnalysisLoop();
    } else {
      this.stopAnalysisLoop();
      this.state.suggestions = [];
      this.state.autoApply = false;
    }
    this.emit();
  }

  /**
   * Enable/disable auto-apply of AI suggestions
   */
  setAutoApply(autoApply: boolean) {
    this.state.autoApply = autoApply;
    this.emit();
  }

  /**
   * Update cached live data for analysis
   */
  updateLiveData(data: Record<string, number>) {
    this.liveDataCache = { ...this.liveDataCache, ...data };
    this.state.engineRunning = (data.rpm || 0) > 0;
  }

  /**
   * Update vehicle context
   */
  setVehicleContext(engineType: string, currentMap: string, modifications: string[]) {
    this.engineType = engineType;
    this.currentMap = currentMap;
    this.modifications = modifications;
  }

  /**
   * Start the periodic AI analysis loop
   */
  private startAnalysisLoop() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.runAnalysis();
    }, ANALYSIS_INTERVAL_MS);
  }

  private stopAnalysisLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Run a single AI analysis cycle
   */
  async runAnalysis() {
    if (this.state.analyzing) return;
    if (!this.state.engineRunning) return;
    if (!this.state.enabled) return;

    this.state.analyzing = true;
    this.emit();

    try {
      const result = await analyzeLiveData(
        this.liveDataCache,
        this.engineType,
        this.currentMap,
        this.modifications
      );

      // Map AI recommendations to tuning parameters
      const suggestions = this.mapRecommendationsToSuggestions(
        result.recommendations,
        result.safetyAssessment
      );

      this.state.suggestions = suggestions;
      this.state.lastAnalysisTime = Date.now();
      this.state.lastError = null;

      // Auto-apply safe suggestions if enabled
      if (this.state.autoApply) {
        await this.applySafeSuggestions(suggestions);
      }

      // Reset consecutive unsafe counter if we got good suggestions
      if (suggestions.some(s => s.isSafe)) {
        this.state.consecutiveUnsafe = 0;
      }
    } catch (err: any) {
      this.state.lastError = err?.message || 'AI analysis failed';
    } finally {
      this.state.analyzing = false;
      this.emit();
    }
  }

  /**
   * Map AI recommendations to tuning parameter suggestions
   */
  private mapRecommendationsToSuggestions(
    recommendations: { parameter: string; currentValue: number; suggestedValue: number; reason: string; priority: string; expectedGain?: number }[],
    safetyAssessment: string
  ): AiTuningSuggestion[] {
    const paramMap: Record<string, string> = {
      'Global Timing': 'timing_global',
      'Low Load Timing': 'timing_low_load',
      'High Load Timing': 'timing_high_load',
      'WOT Timing': 'timing_wot',
      'Max Knock Retard': 'knock_retard_max',
      'Fuel Correction': 'fuel_correction',
      'WOT Fuel': 'fuel_wot',
      'Startup Enrichment': 'fuel_startup',
      'Injector Deadtime': 'injector_deadtime',
      'Boost Target': 'boost_target',
      'Boost Taper Start': 'boost_taper_start',
      'Boost Taper End': 'boost_taper_end',
      'Wastegate Duty': 'wastegate_duty',
      'Wastegate Preload': 'wg_preload',
      'Idle RPM': 'idle_rpm',
      'Idle Lambda': 'idle_lean',
      'Soft Rev Limit': 'rev_limit_soft',
      'Hard Rev Limit': 'rev_limit_hard',
      'Speed Limit': 'speed_limit',
      'Torque Limit': 'torque_limit',
      'VANOS Intake': 'vanos_intake',
      'VANOS Exhaust': 'vanos_exhaust',
      'Throttle Sensitivity': 'throttle_sensitivity',
    };

    return recommendations
      .map(rec => {
        const paramId = paramMap[rec.parameter];
        if (!paramId) return null;

        const param = liveTuningEngine.getParameter(paramId);
        if (!param) return null;

        const delta = rec.suggestedValue - rec.currentValue;
        const absDelta = Math.abs(delta);

        // Determine safety impact
        let safetyImpact: 'safe' | 'moderate' | 'risky' = 'safe';
        if (param.isDangerous && absDelta > param.step * 2) {
          safetyImpact = 'risky';
        } else if (param.isDangerous) {
          safetyImpact = 'moderate';
        }

        // Override if AI says it's risky
        if (safetyAssessment.toLowerCase().includes('risk')) {
          safetyImpact = 'risky';
        }

        return {
          parameterId: paramId,
          parameterName: param.name,
          category: param.category,
          currentValue: rec.currentValue,
          suggestedValue: rec.suggestedValue,
          delta,
          unit: param.unit,
          reason: rec.reason,
          confidence: 70 + (rec.expectedGain || 0),
          isSafe: safetyImpact === 'safe',
          safetyImpact,
        };
      })
      .filter((s): s is AiTuningSuggestion => s !== null);
  }

  /**
   * Apply only safe AI suggestions to the tuning engine
   */
  private async applySafeSuggestions(suggestions: AiTuningSuggestion[]) {
    const safeSuggestions = suggestions.filter(s => s.isSafe && Math.abs(s.delta) > 0.01);

    if (safeSuggestions.length === 0) return;

    for (const sug of safeSuggestions) {
      // Clamp to safety limits
      const param = liveTuningEngine.getParameter(sug.parameterId);
      if (!param) continue;

      const clampedValue = Math.max(param.min, Math.min(param.max, sug.suggestedValue));

      // Only apply small changes in auto-mode
      const maxAutoDelta = param.isDangerous ? param.step : param.step * 3;
      if (Math.abs(clampedValue - param.currentValue) > Math.abs(maxAutoDelta) * 2) {
        continue; // Skip large changes in auto mode
      }

      liveTuningEngine.setParameterValue(sug.parameterId, clampedValue);
      await liveTuningEngine.applyParameter(sug.parameterId);
      this.state.totalAdjustments++;
    }
  }

  /**
   * Manually apply a specific AI suggestion
   */
  async applySuggestion(suggestion: AiTuningSuggestion): Promise<boolean> {
    const param = liveTuningEngine.getParameter(suggestion.parameterId);
    if (!param) return false;

    const clampedValue = Math.max(param.min, Math.min(param.max, suggestion.suggestedValue));
    liveTuningEngine.setParameterValue(suggestion.parameterId, clampedValue);
    const success = await liveTuningEngine.applyParameter(suggestion.parameterId);
    if (success) {
      this.state.totalAdjustments++;
      // Remove applied suggestion
      this.state.suggestions = this.state.suggestions.filter(
        s => s.parameterId !== suggestion.parameterId
      );
      this.emit();
    }
    return success;
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(parameterId: string) {
    this.state.suggestions = this.state.suggestions.filter(
      s => s.parameterId !== parameterId
    );
    this.emit();
  }

  /**
   * Clear all suggestions
   */
  clearSuggestions() {
    this.state.suggestions = [];
    this.emit();
  }

  /**
   * Get suggestions for a specific category
   */
  getSuggestionsByCategory(category: string): AiTuningSuggestion[] {
    return this.state.suggestions.filter(s => s.category === category);
  }

  /**
   * Check if AI live tuning is active and working
   */
  isActive(): boolean {
    return this.state.enabled && this.state.engineRunning && !this.state.analyzing;
  }

  /**
   * Destroy service, cleanup intervals
   */
  destroy() {
    this.stopAnalysisLoop();
    this.listeners = [];
  }
}

export const aiLiveTuningService = new AiLiveTuningService();
export default aiLiveTuningService;
