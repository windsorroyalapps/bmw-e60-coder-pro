import React from 'react';
import { useStore } from '@/hooks/useStore';
import { ENGINE_SPECS } from '@/lib/engineData';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import {
  X, Zap, Gauge, Fuel, Cpu, Sparkles,
  Check
} from 'lucide-react';
import type { MapType } from '@/types';

const MAP_TYPES: { id: MapType; name: string; icon: typeof Zap; color: string; desc: string }[] = [
  { id: 'stock', name: 'Stock', icon: Gauge, color: '#4CAF50', desc: 'Factory' },
  { id: 'economy', name: 'Eco', icon: Fuel, color: '#009688', desc: 'Save fuel' },
  { id: 'stage1', name: 'Stage 1', icon: Zap, color: '#2196F3', desc: '+50hp' },
  { id: 'stage2', name: 'Stage 2', icon: Zap, color: '#FF9800', desc: '+120hp' },
  { id: 'stage2plus', name: 'Stage 2+', icon: Zap, color: '#FF5722', desc: '+200hp' },
  { id: 'stage3', name: 'Stage 3', icon: Zap, color: '#F44336', desc: '+400hp' },
  { id: 'valet', name: 'Valet', icon: Gauge, color: '#607D8B', desc: '80km/h' },
];

export const QuickSwitch: React.FC = () => {
  const { showQuickSwitch, setShowQuickSwitch, profile, setProfile } = useStore();

  if (!showQuickSwitch) return null;

  const engineSpec = ENGINE_SPECS[profile.engine];
  const currentMapId = profile.currentMap;

  const handleSwitch = (mapId: MapType) => {
    if (mapId === currentMapId) return;
    setProfile({ ...profile, currentMap: mapId });
    setShowQuickSwitch(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickSwitch(false)}>
      <div
        className="bg-[#0d1117] border border-gray-700 rounded-t-2xl w-full max-w-2xl p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Quick Map Switch</h2>
          </div>
          <button onClick={() => setShowQuickSwitch(false)} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current */}
        <div className="flex items-center gap-3 mb-4 bg-[#161b22] rounded-xl p-3">
          <Cpu className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <div className="text-xs text-gray-500">Current | {engineSpec.name}</div>
            <div className="text-sm text-white font-semibold">
              {MAP_TYPES.find(m => m.id === currentMapId)?.name || currentMapId}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Est. Output</div>
            <div className="text-sm text-orange-400 font-mono">
              {aiTuningEngine.estimateMapHp(profile.engine, currentMapId as MapType)}hp
            </div>
          </div>
        </div>

        {/* Map Grid */}
        <div className="grid grid-cols-4 gap-2">
          {MAP_TYPES.filter(m => engineSpec.supportedMaps.includes(m.id)).map(map => {
            const isActive = currentMapId === map.id;
            const estHp = aiTuningEngine.estimateMapHp(profile.engine, map.id);
            return (
              <button
                key={map.id}
                onClick={() => handleSwitch(map.id)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-[#161b22] hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: isActive ? `${map.color}30` : '#1a1a2e' }}
                >
                  <map.icon className="w-4 h-4" style={{ color: map.color }} />
                </div>
                <span className="text-xs font-semibold text-white">{map.name}</span>
                <span className="text-[10px] text-gray-500">{map.desc}</span>
                <span className="text-[10px] font-mono text-orange-400">{estHp}hp</span>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety Warning */}
        <div className="mt-4 flex items-center gap-2 text-yellow-400 text-xs bg-yellow-500/10 rounded-lg p-2.5">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span>Map changes take effect after flash confirmation. Always flash at safe speeds.</span>
        </div>
      </div>
    </div>
  );
};

export default QuickSwitch;
