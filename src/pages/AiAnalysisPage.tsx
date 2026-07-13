import React, { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import {
  Brain, AlertTriangle, CheckCircle, Info, Zap, Fuel,
  Gauge, Settings, TrendingUp, Shield, Play, Sparkles
} from 'lucide-react';

export const AiAnalysisPage: React.FC = () => {
  const {
    liveData, currentMap, aiRecommendations,
    refreshAiAnalysis, applyRecommendation, isAiTuning, setIsAiTuning
  } = useStore();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAiAnalysis();
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshAiAnalysis]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'suggestion': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'suggestion': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Zap className="w-4 h-4" />;
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'boost': return <TrendingUp className="w-4 h-4" />;
      case 'throttle': return <Gauge className="w-4 h-4" />;
      case 'vanos': return <Settings className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const criticalCount = aiRecommendations.filter(r => r.severity === 'critical').length;
  const warningCount = aiRecommendations.filter(r => r.severity === 'warning').length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">AI Analysis</h1>
              <p className="text-xs text-gray-500">Real-time tuning analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                {criticalCount} Critical
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                {warningCount} Warning
              </div>
            )}
            <button
              onClick={() => setIsAiTuning(!isAiTuning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isAiTuning
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isAiTuning ? 'AI Active' : 'AI Tuning'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Live Data Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">RPM</div>
            <div className="text-lg font-mono text-white">{liveData.rpm.toLocaleString()}</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">Boost</div>
            <div className="text-lg font-mono text-orange-400">{liveData.boost.toFixed(2)} bar</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">AFR</div>
            <div className="text-lg font-mono text-green-400">{liveData.afr.toFixed(2)} λ</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">IAT</div>
            <div className="text-lg font-mono text-blue-400">{Math.round(liveData.iat)}°C</div>
          </div>
        </div>

        {/* AI Tuning Status */}
        {isAiTuning && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold text-purple-300">AI Auto-Tuning Active</div>
              <div className="text-xs text-purple-400">
                Automatically applying safe optimizations based on live data analysis
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          {aiRecommendations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">All parameters optimal</p>
              <p className="text-sm">No tuning adjustments recommended at this time</p>
            </div>
          ) : (
            aiRecommendations.map(rec => (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 ${getSeverityBg(rec.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(rec.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400">{getTypeIcon(rec.type)}</span>
                      <span className="font-semibold text-white capitalize">{rec.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rec.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        rec.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {rec.severity}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        Confidence: {rec.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{rec.message}</p>
                    <p className="text-xs text-gray-500 mb-2">{rec.reason}</p>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Current: </span>
                        <span className="text-white font-mono">{rec.currentValue.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Recommended: </span>
                        <span className="text-green-400 font-mono">{rec.recommendedValue.toFixed(2)}</span>
                      </div>
                      {rec.autoApplicable && (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Auto-safe
                        </span>
                      )}
                    </div>

                    {rec.autoApplicable && (
                      <button
                        onClick={() => applyRecommendation(rec.id)}
                        className="mt-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Performance Summary */}
        {currentMap && (
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <h3 className="font-semibold text-white mb-3">Current Map Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Map</div>
                <div className="text-white">{currentMap.name}</div>
              </div>
              <div>
                <div className="text-gray-500">Safety Score</div>
                <div className={`font-mono ${
                  currentMap.safetyScore >= 80 ? 'text-green-400' :
                  currentMap.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {currentMap.safetyScore}/100
                </div>
              </div>
              <div>
                <div className="text-gray-500">AI Generated</div>
                <div className="text-purple-400">{currentMap.aiGenerated ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalysisPage;
