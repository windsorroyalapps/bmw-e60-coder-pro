import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { liveTuningEngine, type LiveParameterCategory } from '@/lib/liveTuningEngine';
import {
  Zap, Fuel, Gauge, Clock, Shield, Settings, Activity,
  ChevronUp, ChevronDown, RotateCcw, Undo2, Redo2,
  Check, X, AlertTriangle, Play, Square, Save, Loader,
  TrendingUp, Power
} from 'lucide-react';

const CATEGORY_CONFIG: Record<LiveParameterCategory, { icon: typeof Zap; label: string; color: string }> = {
  timing: { icon: Zap, label: 'Timing', color: 'text-yellow-400' },
  fuel: { icon: Fuel, label: 'Fuel', color: 'text-green-400' },
  boost: { icon: TrendingUp, label: 'Boost', color: 'text-orange-400' },
  idle: { icon: Clock, label: 'Idle', color: 'text-blue-400' },
  limits: { icon: Shield, label: 'Limits', color: 'text-red-400' },
  vanos: { icon: Settings, label: 'VANOS', color: 'text-purple-400' },
  throttle: { icon: Activity, label: 'Throttle', color: 'text-cyan-400' },
};

export const LiveTuningPanel: React.FC = () => {
  const { liveData, profile, obd2 } = useStore();
  const [active, setActive] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<LiveParameterCategory | null>('timing');
  const [params, setParams] = useState(liveTuningEngine.getState().parameters);
  const [hasPending, setHasPending] = useState(false);
  const [writing, setWriting] = useState(false);
  const [writeResult, setWriteResult] = useState<{ applied: string[]; failed: string[] } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const engineRunning = liveData.rpm > 0;
  const connected = obd2.connectionState === 'connected';

  // Initialize engine on first activation
  useEffect(() => {
    if (active && !liveTuningEngine.getState().isActive) {
      liveTuningEngine.initialize(profile.engine);
      refreshParams();
    }
  }, [active, profile.engine]);

  const refreshParams = useCallback(() => {
    const state = liveTuningEngine.getState();
    setParams({ ...state.parameters });
    setHasPending(state.hasPendingChanges);
  }, []);

  const handleAdjust = (id: string, dir: 'up' | 'down') => {
    liveTuningEngine.adjustParameter(id, dir);
    refreshParams();
  };

  const handleSetValue = (id: string, val: number) => {
    liveTuningEngine.setParameterValue(id, val);
    refreshParams();
  };

  const handleApplyAll = async () => {
    setWriting(true);
    const result = await liveTuningEngine.applyAll();
    setWriteResult(result);
    setShowResult(true);
    setWriting(false);
    refreshParams();
    setTimeout(() => setShowResult(false), 3000);
  };

  const handleRevertAll = () => {
    liveTuningEngine.revertAll();
    refreshParams();
  };

  const handleResetAll = () => {
    liveTuningEngine.resetAllToDefault();
    refreshParams();
  };

  const handleUndo = () => {
    liveTuningEngine.undo();
    refreshParams();
  };

  const handleRedo = () => {
    liveTuningEngine.redo();
    refreshParams();
  };

  const handleRevertOne = (id: string) => {
    liveTuningEngine.revertParameter(id);
    refreshParams();
  };

  const byCategory = liveTuningEngine.getByCategory();
  const dangerCount = liveTuningEngine.getDangerCount();
  const undoAvailable = liveTuningEngine.getState().undoStack.length > 0;
  const redoAvailable = liveTuningEngine.getState().redoStack.length > 0;

  if (!active) {
    return (
      <div className="p-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
          <Power className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white mb-1">Live Tuning</h3>
          <p className="text-xs text-gray-500 mb-3">Adjust DME parameters in real-time while engine runs</p>
          <button
            onClick={() => setActive(true)}
            disabled={!connected}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs px-4 py-2 rounded-lg transition-colors mx-auto"
          >
            <Play className="w-3.5 h-3.5" />
            {connected ? 'Start Live Tuning' : 'Connect to Vehicle First'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Live Tuning</h2>
            {dangerCount > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {dangerCount} danger
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleUndo} disabled={!undoAvailable} title="Undo" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={!redoAvailable} title="Redo" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors">
              <Redo2 className="w-4 h-4" />
            </button>
            <button onClick={() => setActive(false)} title="Close" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-2">
          {hasPending && (
            <>
              <button
                onClick={handleApplyAll}
                disabled={writing || !engineRunning}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                {writing ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {writing ? 'Writing...' : 'Apply All'}
              </button>
              <button
                onClick={handleRevertAll}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Revert
              </button>
            </>
          )}
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <Square className="w-3 h-3" />
            Reset All
          </button>
          {!engineRunning && (
            <span className="text-[10px] text-yellow-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Engine off - changes queued
            </span>
          )}
        </div>

        {/* Write Result */}
        {showResult && writeResult && (
          <div className={`mt-2 text-xs px-2 py-1 rounded flex items-center gap-1 ${
            writeResult.failed.length === 0 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {writeResult.failed.length === 0 ? (
              <><Check className="w-3 h-3" /> Applied {writeResult.applied.length} parameters</>
            ) : (
              <><AlertTriangle className="w-3 h-3" /> {writeResult.applied.length} applied, {writeResult.failed.length} failed</>
            )}
          </div>
        )}
      </div>

      {/* Parameter List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(Object.entries(byCategory) as [LiveParameterCategory, typeof byCategory['timing']][]).map(([cat, catParams]) => {
          if (catParams.length === 0) return null;
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const isExpanded = expandedCategory === cat;
          const catPending = catParams.some(p => p.pendingValue !== p.currentValue);
          const catDanger = catParams.some(p => liveTuningEngine.isDangerous(p.id));

          return (
            <div key={cat} className="rounded-xl border border-gray-800 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${
                  isExpanded ? 'bg-gray-800/50' : 'bg-[#0d1117] hover:bg-gray-800/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className="text-sm font-medium text-white">{config.label}</span>
                <span className="text-xs text-gray-600 ml-auto">{catParams.length}</span>
                {catPending && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                {catDanger && <AlertTriangle className="w-3 h-3 text-red-400" />}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {/* Parameters */}
              {isExpanded && (
                <div className="divide-y divide-gray-800/50">
                  {catParams.map(param => {
                    const isPending = param.pendingValue !== param.currentValue;
                    const isDanger = liveTuningEngine.isDangerous(param.id);
                    const pct = ((param.pendingValue - param.min) / (param.max - param.min)) * 100;

                    return (
                      <div key={param.id} className={`px-3 py-2.5 ${isPending ? 'bg-yellow-500/5' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white font-medium">{param.name}</span>
                            {isDanger && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            {!param.liveEditable && (
                              <span className="text-[9px] bg-gray-700 text-gray-400 px-1 rounded">OFFLINE</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleRevertOne(param.id)}
                                className="text-[10px] text-gray-500 hover:text-yellow-400 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            <span className={`text-xs font-mono ${isPending ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {param.pendingValue.toFixed(param.step < 1 ? 2 : 0)}{param.unit}
                            </span>
                          </div>
                        </div>

                        {/* Slider */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjust(param.id, 'down')}
                            disabled={param.pendingValue <= param.min}
                            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center text-gray-400 transition-colors flex-shrink-0"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative">
                            <div
                              className={`h-1.5 rounded-full transition-all ${isDanger ? 'bg-red-500' : isPending ? 'bg-yellow-400' : 'bg-blue-500'}`}
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                            />
                          </div>

                          <button
                            onClick={() => handleAdjust(param.id, 'up')}
                            disabled={param.pendingValue >= param.max}
                            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center text-gray-400 transition-colors flex-shrink-0"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Range + Description */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-gray-600">{param.min}{param.unit}</span>
                          <span className="text-[9px] text-gray-600 text-center flex-1 px-2 truncate">{param.description}</span>
                          <span className="text-[9px] text-gray-600">{param.max}{param.unit}</span>
                        </div>

                        {/* Write status */}
                        {param.lastWriteStatus === 'success' && (
                          <div className="flex items-center gap-1 mt-1">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                            <span className="text-[9px] text-green-400">Written to DME</span>
                          </div>
                        )}
                        {param.lastWriteStatus === 'error' && (
                          <div className="flex items-center gap-1 mt-1">
                            <X className="w-2.5 h-2.5 text-red-400" />
                            <span className="text-[9px] text-red-400">{param.lastWriteError || 'Write failed'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveTuningPanel;
