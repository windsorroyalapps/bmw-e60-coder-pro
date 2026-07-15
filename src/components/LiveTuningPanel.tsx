import React, { useState, useEffect } from 'react';
import { liveTuningEngine, type TuningParameter, type LiveTuningState } from '@/lib/liveTuningEngine';
import { aiLiveTuningService, type AiTuningSuggestion, type AiLiveTuningState } from '@/lib/aiLiveTuningService';
import { useStore } from '@/hooks/useStore';
import {
  Zap, Fuel, TrendingUp, CircleDot, Shield,
  Settings, Gauge, RotateCcw, Undo2, Redo2,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Activity, Save, XCircle, SlidersHorizontal,
  Brain, Sparkles, X, Wand2, Cpu
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  timing: <Zap className="w-4 h-4 text-yellow-400" />,
  fuel: <Fuel className="w-4 h-4 text-blue-400" />,
  boost: <TrendingUp className="w-4 h-4 text-orange-400" />,
  idle: <CircleDot className="w-4 h-4 text-green-400" />,
  limits: <Shield className="w-4 h-4 text-red-400" />,
  vanos: <Settings className="w-4 h-4 text-purple-400" />,
  throttle: <Gauge className="w-4 h-4 text-pink-400" />,
};

const CATEGORY_NAMES: Record<string, string> = {
  timing: 'Ignition Timing',
  fuel: 'Fuel System',
  boost: 'Boost Control',
  idle: 'Idle Control',
  limits: 'Safety Limits',
  vanos: 'VANOS Timing',
  throttle: 'Throttle',
};

const CATEGORY_COLORS: Record<string, string> = {
  timing: 'border-yellow-500/30 bg-yellow-500/5',
  fuel: 'border-blue-500/30 bg-blue-500/5',
  boost: 'border-orange-500/30 bg-orange-500/5',
  idle: 'border-green-500/30 bg-green-500/5',
  limits: 'border-red-500/30 bg-red-500/5',
  vanos: 'border-purple-500/30 bg-purple-500/5',
  throttle: 'border-pink-500/30 bg-pink-500/5',
};

const SAFETY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  risky: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export const LiveTuningPanel: React.FC = () => {
  // Local engine state
  const [engineState, setEngineState] = useState<LiveTuningState>(liveTuningEngine.getState());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['timing']));
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'done' | 'error'>('idle');

  // AI state
  const [aiState, setAiState] = useState<AiLiveTuningState>(aiLiveTuningService.getState());

  // Global store
  const {
    liveData, profile, aiApiAvailable,
    aiLiveTuningEnabled, setAiLiveTuningEnabled,
    aiLiveTuningAutoApply, setAiLiveTuningAutoApply,
  } = useStore();

  // Sync engine state
  useEffect(() => {
    const unsub = liveTuningEngine.subscribe((s) => setEngineState(s));
    return unsub;
  }, []);

  // Sync AI state
  useEffect(() => {
    const unsub = aiLiveTuningService.subscribe((s) => setAiState(s));
    return unsub;
  }, []);

  // Feed live data to AI service + vehicle context
  useEffect(() => {
    aiLiveTuningService.updateLiveData(liveData as unknown as Record<string, number>);
    aiLiveTuningService.setVehicleContext(
      profile.engine,
      profile.currentMap,
      [
        profile.hasUpgradedIntercooler ? 'Upgraded Intercooler' : '',
        profile.hasUpgradedTurbo ? 'Upgraded Turbo(s)' : '',
        profile.hasUpgradedFuelPump ? 'Upgraded Fuel Pump' : '',
        profile.hasDownpipes ? 'Downpipes' : '',
        profile.hasExhaust ? 'Catback Exhaust' : '',
        profile.hasMethInjection ? 'Methanol Injection' : '',
      ].filter(Boolean)
    );
  }, [liveData, profile]);

  // Sync enabled/autoApply state with service
  useEffect(() => {
    const svcEnabled = aiLiveTuningService.getState().enabled;
    if (svcEnabled !== aiLiveTuningEnabled) {
      aiLiveTuningService.setEnabled(aiLiveTuningEnabled);
    }
  }, [aiLiveTuningEnabled]);

  useEffect(() => {
    const svcAuto = aiLiveTuningService.getState().autoApply;
    if (svcAuto !== aiLiveTuningAutoApply) {
      aiLiveTuningService.setAutoApply(aiLiveTuningAutoApply);
    }
  }, [aiLiveTuningAutoApply]);

  const categories = liveTuningEngine.getCategories();

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleAdjust = (id: string, direction: 1 | -1) => {
    liveTuningEngine.adjustParameter(id, direction);
  };

  const handleApply = async () => {
    setApplyStatus('applying');
    const result = await liveTuningEngine.applyAll();
    setApplyStatus(result.failed === 0 ? 'done' : 'error');
    setTimeout(() => setApplyStatus('idle'), 2000);
  };

  const handleApplySingle = async (id: string) => {
    await liveTuningEngine.applyParameter(id);
  };

  const handleRevert = () => liveTuningEngine.revertAll();
  const handleReset = () => liveTuningEngine.resetAll();
  const handleUndo = async () => { await liveTuningEngine.undo(); };
  const handleRedo = async () => { await liveTuningEngine.redo(); };

  const handleApplyAiSuggestion = async (suggestion: AiTuningSuggestion) => {
    await aiLiveTuningService.applySuggestion(suggestion);
  };

  const handleDismissAiSuggestion = (parameterId: string) => {
    aiLiveTuningService.dismissSuggestion(parameterId);
  };

  const handleForceAnalysis = async () => {
    await aiLiveTuningService.runAnalysis();
  };

  const pendingChanges = engineState.parameters.filter(p => p.pendingValue !== p.currentValue);
  const hasDangerous = liveTuningEngine.hasDangerousChanges();

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Toolbar */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        {/* Row 1: Title + Manual controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Live Parameters</span>
            {pendingChanges.length > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {pendingChanges.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleUndo} disabled={!liveTuningEngine.canUndo()}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors" title="Undo">
              <Undo2 className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button onClick={handleRedo} disabled={!liveTuningEngine.canRedo()}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors" title="Redo">
              <Redo2 className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button onClick={handleRevert} disabled={pendingChanges.length === 0}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors" title="Revert All">
              <RotateCcw className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button onClick={handleReset}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors" title="Reset All to Default">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Row 2: AI Live Tuning Controls */}
        <div className="flex items-center gap-2">
          {/* AI Enable Toggle */}
          <button
            onClick={() => setAiLiveTuningEnabled(!aiLiveTuningEnabled)}
            disabled={!aiApiAvailable}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
              aiLiveTuningEnabled
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : aiApiAvailable
                  ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
            }`}
          >
            {aiLiveTuningEnabled ? (
              <><Sparkles className="w-3.5 h-3.5" /> AI Active</>
            ) : (
              <><Brain className="w-3.5 h-3.5" /> AI Tuning</>
            )}
          </button>

          {/* Auto-Apply Toggle */}
          {aiLiveTuningEnabled && (
            <button
              onClick={() => setAiLiveTuningAutoApply(!aiLiveTuningAutoApply)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all border ${
                aiLiveTuningAutoApply
                  ? 'bg-green-600/20 text-green-400 border-green-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto
            </button>
          )}

          {/* Force Analysis Button */}
          {aiLiveTuningEnabled && (
            <button
              onClick={handleForceAnalysis}
              disabled={aiState.analyzing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 transition-colors border border-gray-700"
            >
              {aiState.analyzing ? (
                <><Cpu className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              ) : (
                <><Cpu className="w-3.5 h-3.5" /> Analyze</>
              )}
            </button>
          )}

          {/* AI Status */}
          {aiLiveTuningEnabled && (
            <div className="ml-auto flex items-center gap-1.5">
              {aiState.analyzing ? (
                <span className="flex items-center gap-1 text-[10px] text-purple-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Thinking...
                </span>
              ) : aiState.suggestions.length > 0 ? (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  {aiState.suggestions.length} suggestion{aiState.suggestions.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  No suggestions
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestions Banner (top-level) */}
      {aiLiveTuningEnabled && aiState.suggestions.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Suggestions
            </span>
            <button
              onClick={() => aiLiveTuningService.clearSuggestions()}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear All
            </button>
          </div>
          {aiState.suggestions.slice(0, 3).map(sug => (
            <AiSuggestionCard
              key={sug.parameterId}
              suggestion={sug}
              onApply={handleApplyAiSuggestion}
              onDismiss={handleDismissAiSuggestion}
            />
          ))}
          {aiState.suggestions.length > 3 && (
            <p className="text-[10px] text-gray-600 text-center">
              +{aiState.suggestions.length - 3} more in categories below
            </p>
          )}
        </div>
      )}

      {/* AI Error */}
      {aiLiveTuningEnabled && aiState.lastError && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-red-300">{aiState.lastError}</span>
        </div>
      )}

      {/* Pending Changes Warning */}
      {hasDangerous && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            Dangerous changes pending. These parameters can cause engine damage if set incorrectly.
          </div>
        </div>
      )}

      {/* Apply Bar */}
      {pendingChanges.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={applyStatus === 'applying'}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm py-2.5 rounded-xl transition-colors"
          >
            {applyStatus === 'applying' ? (
              <><Activity className="w-4 h-4 animate-spin" /> Applying...</>
            ) : applyStatus === 'done' ? (
              <><CheckCircle className="w-4 h-4" /> Applied!</>
            ) : applyStatus === 'error' ? (
              <><XCircle className="w-4 h-4" /> Partial Fail</>
            ) : (
              <><Save className="w-4 h-4" /> Apply {pendingChanges.length} Change{pendingChanges.length > 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      )}

      {/* Parameters List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {categories.map(category => {
          const isExpanded = expandedCategories.has(category);
          const catParams = engineState.parameters.filter(p => p.category === category);
          const catAiSuggestions = aiState.suggestions.filter(s => s.category === category);
          const catPending = catParams.filter(p => p.pendingValue !== p.currentValue).length;

          return (
            <div key={category} className={`rounded-xl border ${CATEGORY_COLORS[category] || 'border-gray-700 bg-[#0d1117]'}`}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[category]}
                  <span className="text-sm font-medium text-white">{CATEGORY_NAMES[category] || category}</span>
                  {catPending > 0 && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{catPending}</span>
                  )}
                  {catAiSuggestions.length > 0 && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {catAiSuggestions.length}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {/* AI Suggestions for this category */}
              {isExpanded && catAiSuggestions.length > 0 && (
                <div className="px-3 pb-2 space-y-1.5">
                  {catAiSuggestions.map(sug => (
                    <AiSuggestionInline
                      key={sug.parameterId}
                      suggestion={sug}
                      onApply={handleApplyAiSuggestion}
                      onDismiss={handleDismissAiSuggestion}
                    />
                  ))}
                </div>
              )}

              {/* Parameter Controls */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {catParams.map(param => (
                    <ParameterControl
                      key={param.id}
                      param={param}
                      aiSuggestion={aiState.suggestions.find(s => s.parameterId === param.id)}
                      onAdjust={handleAdjust}
                      onApply={handleApplySingle}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: AI stats */}
      {aiLiveTuningEnabled && (
        <div className="px-4 py-2 bg-[#0d1117] border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            AI Live Tuning {aiLiveTuningAutoApply ? '(Auto)' : '(Manual)'}
          </span>
          {aiState.totalAdjustments > 0 && (
            <span>{aiState.totalAdjustments} adjustment{aiState.totalAdjustments > 1 ? 's' : ''} applied</span>
          )}
        </div>
      )}
    </div>
  );
};

// AI Suggestion Card (top banner)
const AiSuggestionCard: React.FC<{
  suggestion: AiTuningSuggestion;
  onApply: (s: AiTuningSuggestion) => void;
  onDismiss: (id: string) => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const colors = SAFETY_COLORS[suggestion.safetyImpact];
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-2.5`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className={`w-3 h-3 ${colors.text}`} />
          <span className="text-xs font-medium text-white">{suggestion.parameterName}</span>
          <span className={`text-[9px] px-1 py-0.5 rounded ${colors.bg} ${colors.text}`}>
            {suggestion.safetyImpact}
          </span>
        </div>
        <button onClick={() => onDismiss(suggestion.parameterId)}
          className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mb-1.5 line-clamp-2">{suggestion.reason}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          {suggestion.currentValue.toFixed(1)} {suggestion.unit}
          <span className="text-gray-600"> {'->'} </span>
          <span className={colors.text}>{suggestion.suggestedValue.toFixed(1)} {suggestion.unit}</span>
        </span>
        <button
          onClick={() => onApply(suggestion)}
          disabled={!suggestion.isSafe}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            suggestion.isSafe
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {suggestion.isSafe ? 'Apply' : 'Unsafe'}
        </button>
      </div>
    </div>
  );
};

// AI Suggestion Inline (within category)
const AiSuggestionInline: React.FC<{
  suggestion: AiTuningSuggestion;
  onApply: (s: AiTuningSuggestion) => void;
  onDismiss: (id: string) => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const colors = SAFETY_COLORS[suggestion.safetyImpact];
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-2 flex items-center gap-2`}>
      <Sparkles className={`w-3.5 h-3.5 ${colors.text} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-white">{suggestion.parameterName}</span>
          <span className={`text-[8px] px-1 rounded ${colors.bg} ${colors.text}`}>{suggestion.safetyImpact}</span>
        </div>
        <div className="text-[10px] text-gray-500">
          {suggestion.currentValue.toFixed(1)} {'->'} <span className={colors.text}>{suggestion.suggestedValue.toFixed(1)}</span> {suggestion.unit}
        </div>
      </div>
      <button
        onClick={() => onApply(suggestion)}
        disabled={!suggestion.isSafe}
        className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${
          suggestion.isSafe ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        Apply
      </button>
      <button onClick={() => onDismiss(suggestion.parameterId)}
        className="text-gray-600 hover:text-gray-400 flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// Individual Parameter Control (with optional AI suggestion indicator)
const ParameterControl: React.FC<{
  param: TuningParameter;
  aiSuggestion?: AiTuningSuggestion;
  onAdjust: (id: string, dir: 1 | -1) => void;
  onApply: (id: string) => void;
}> = ({ param, aiSuggestion, onAdjust, onApply }) => {
  const isPending = param.pendingValue !== param.currentValue;
  const isDangerous = param.isDangerous && isPending;
  const percent = ((param.pendingValue - param.min) / (param.max - param.min)) * 100;

  // If there's an AI suggestion, show its target as a marker
  const aiPercent = aiSuggestion
    ? ((aiSuggestion.suggestedValue - param.min) / (param.max - param.min)) * 100
    : null;

  return (
    <div className={`rounded-lg p-2.5 ${isPending ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-[#161b22]'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white font-medium">{param.name}</span>
          {isDangerous && <AlertTriangle className="w-3 h-3 text-red-400" />}
          {param.requiresRestart && (
            <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded">R</span>
          )}
          {aiSuggestion && (
            <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded flex items-center gap-0.5">
              <Sparkles className="w-2 h-2" />
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${isPending ? 'text-blue-400' : 'text-gray-400'}`}>
            {param.pendingValue.toFixed(param.step < 1 ? 2 : 0)}{param.unit}
          </span>
          {isPending && (
            <button onClick={() => onApply(param.id)}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors">
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Slider Bar with optional AI marker */}
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2 relative">
        <div
          className={`h-1.5 rounded-full transition-all ${isDangerous ? 'bg-red-500' : isPending ? 'bg-blue-500' : 'bg-gray-600'}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
        {aiPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 border border-purple-300 shadow-sm shadow-purple-500/50"
            style={{ left: `${Math.max(0, Math.min(100, aiPercent))}%`, transform: `translate(-50%, -50%)` }}
            title={`AI suggests ${aiSuggestion?.suggestedValue.toFixed(1)}${param.unit}`}
          />
        )}
      </div>

      {/* +/- Buttons */}
      <div className="flex items-center justify-between">
        <button onClick={() => onAdjust(param.id, -1)}
          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
          <span className="text-gray-300 text-sm">-</span>
        </button>
        <span className="text-[10px] text-gray-600">
          {param.min.toFixed(param.step < 1 ? 1 : 0)} - {param.max.toFixed(param.step < 1 ? 1 : 0)} {param.unit}
        </span>
        <button onClick={() => onAdjust(param.id, 1)}
          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
          <span className="text-gray-300 text-sm">+</span>
        </button>
      </div>
    </div>
  );
};

export default LiveTuningPanel;
