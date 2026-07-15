import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { ENGINE_SPECS, getInjectorsForEngine, calculateMaxHp, calculateRequiredInjectorCc } from '@/lib/engineData';
import { LiveTuningPanel } from '@/components/LiveTuningPanel';
import {
  Cpu, Zap, Fuel, Gauge, Sparkles, AlertTriangle,
  Check, Info, TrendingUp, Activity
} from 'lucide-react';
import type { MapType, InjectorType } from '@/types';

const MAP_PRESETS: Record<MapType, { name: string; description: string; hpGain: number; safety: 'safe' | 'moderate' | 'aggressive' }> = {
  stock: { name: 'Stock', description: 'Factory BMW calibration', hpGain: 0, safety: 'safe' },
  stage1: { name: 'Stage 1', description: '+40hp, requires 93 octane', hpGain: 40, safety: 'safe' },
  stage1p: { name: 'Stage 1+', description: '+60hp, requires 93+ octane', hpGain: 60, safety: 'safe' },
  stage2: { name: 'Stage 2', description: '+80hp, requires bolt-ons', hpGain: 80, safety: 'moderate' },
  stage2p: { name: 'Stage 2+', description: '+110hp, requires full bolt-ons', hpGain: 110, safety: 'moderate' },
  e85: { name: 'E85', description: 'Flex fuel map, up to +130hp', hpGain: 130, safety: 'moderate' },
  race: { name: 'Race', description: 'Track only, maximum power', hpGain: 160, safety: 'aggressive' },
};

const INJECTOR_TYPES: Record<InjectorType, { name: string; cc: number; maxHp: number; type: string }> = {
  stock: { name: 'Stock N54', cc: 540, maxHp: 420, type: 'EV14' },
  index12: { name: 'Index 12', cc: 540, maxHp: 420, type: 'EV14 (Latest)' },
  750cc: { name: '750cc', cc: 750, maxHp: 550, type: 'Bosch' },
  870cc: { name: '870cc', cc: 870, maxHp: 650, type: 'Bosch' },
  1000cc: { name: '1000cc', cc: 1000, maxHp: 750, type: 'Bosch' },
  1200cc: { name: '1200cc', cc: 1200, maxHp: 900, type: 'Bosch' },
  1700cc: { name: '1700cc', cc: 1700, maxHp: 1100, type: 'Port Injection' },
  custom: { name: 'Custom', cc: 0, maxHp: 0, type: 'User Defined' },
};

export const TuningPage: React.FC = () => {
  const { profile, setProfile, aiRecommendations } = useStore();
  const [activeTab, setActiveTab] = useState<'maps' | 'injectors' | 'timing' | 'boost' | 'throttle' | 'live'>('maps');

  const engineSpec = ENGINE_SPECS[profile.engine];
  const currentMap = aiTuningEngine.getTimingMap(profile.currentMap);
  const injectors = getInjectorsForEngine(profile.injectors || 'stock');
  const maxHp = calculateMaxHp(profile);
  const requiredCc = calculateRequiredInjectorCc(maxHp, 6, 0.8);

  const tabs = [
    { id: 'maps', label: 'Maps', icon: Cpu },
    { id: 'injectors', label: 'Injectors', icon: Fuel },
    { id: 'timing', label: 'Timing', icon: Zap },
    { id: 'boost', label: 'Boost', icon: TrendingUp },
    { id: 'throttle', label: 'Throttle', icon: Gauge },
    { id: 'live', label: 'Live Tune', icon: Activity },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-bold text-white">Tuning</h1>
          <span className="text-xs text-gray-500">{engineSpec.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {aiRecommendations.length > 0 && (
            <button className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">
              <Sparkles className="w-3 h-3" />
              {aiRecommendations.length} AI Tips
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 bg-[#0d1117] border-b border-gray-800 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Map Selection */}
        {activeTab === 'maps' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(MAP_PRESETS) as MapType[]).map(map => {
                const preset = MAP_PRESETS[map];
                const isActive = profile.currentMap === map;
                const safetyColor = preset.safety === 'safe' ? 'text-green-400' : preset.safety === 'moderate' ? 'text-yellow-400' : 'text-red-400';
                return (
                  <button
                    key={map}
                    onClick={() => setProfile({ ...profile, currentMap: map })}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-orange-500/20' : 'bg-gray-800'}`}>
                      <Cpu className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{preset.name}</span>
                        <span className={`text-[10px] ${safetyColor}`}>{preset.safety}</span>
                      </div>
                      <p className="text-xs text-gray-500">{preset.description}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-orange-400" />}
                  </button>
                );
              })}
            </div>

            {/* AI Recommendations */}
            {aiRecommendations.length > 0 && (
              <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  AI Recommendations
                </h3>
                <div className="space-y-2">
                  {aiRecommendations.slice(0, 3).map(rec => (
                    <div key={rec.id} className="flex items-start gap-2 text-xs">
                      <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-300">{rec.message}</p>
                        <p className="text-gray-600">Confidence: {rec.confidence}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Injector Selection */}
        {activeTab === 'injectors' && (
          <div className="space-y-4">
            <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-400" />
                Injector Setup
              </h3>
              <div className="space-y-2">
                {(Object.keys(INJECTOR_TYPES) as InjectorType[]).map(type => {
                  const inj = INJECTOR_TYPES[type];
                  const isActive = profile.injectors === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setProfile({ ...profile, injectors: type })}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{inj.name}</div>
                        <div className="text-xs text-gray-500">{inj.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-400 font-mono">{inj.cc > 0 ? `${inj.cc}cc` : 'Custom'}</div>
                        <div className="text-xs text-gray-500">~{inj.maxHp}hp max</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Required Injector Calculator */}
            <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-2">Required Injector Size</h3>
              <p className="text-xs text-gray-400 mb-2">For target {maxHp}hp on {engineSpec.cylinders} cylinders:</p>
              <div className="text-2xl font-mono text-blue-400">{requiredCc}cc</div>
              {injectors.cc < requiredCc && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Current injectors may be too small for full potential
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timing Maps */}
        {activeTab === 'timing' && currentMap && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Ignition Timing Map</h3>
              <div className="grid grid-cols-6 gap-1">
                {currentMap.timing.map(t => (
                  <div key={`${t.rpm}-${t.load}`} className="bg-[#161b22] rounded p-1 text-center">
                    <div className="text-[10px] text-gray-600">{t.rpm}</div>
                    <div className="text-sm font-mono text-yellow-400">{t.advance}°</div>
                    <div className="text-[10px] text-gray-600">{t.load}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Boost Maps */}
        {activeTab === 'boost' && currentMap && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Boost Target Map</h3>
              <div className="flex items-end gap-1 h-40">
                {currentMap.boost.map(b => (
                  <div key={b.rpm} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500/60 rounded-t"
                      style={{ height: `${(b.target / 2.5) * 100}%` }}
                    />
                    <span className="text-[10px] text-gray-500 font-mono">{b.rpm}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Low RPM</span>
                <span>High RPM</span>
              </div>
            </div>
          </div>
        )}

        {/* Throttle Maps */}
        {activeTab === 'throttle' && currentMap && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Throttle Map: {currentMap.throttle[0]?.mode}</h3>
              <div className="flex items-end gap-0.5 h-40">
                {currentMap.throttle.map(t => (
                  <div key={t.pedalPercent} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-purple-500/60 rounded-t"
                      style={{ height: `${t.throttlePercent}%` }}
                    />
                    <span className="text-xs text-gray-500 font-mono">{t.pedalPercent}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Pedal Input (%)</span>
                <span>Throttle Opening (%)</span>
              </div>
            </div>

            {/* Throttle map table */}
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Throttle Response Table</h3>
              <div className="grid grid-cols-5 gap-2">
                {currentMap.throttle.filter(t => t.pedalPercent % 20 === 0).map(t => (
                  <div key={t.pedalPercent} className="bg-[#161b22] rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">{t.pedalPercent}% Pedal</div>
                    <div className="text-sm font-mono text-purple-400">{t.throttlePercent}%</div>
                    <div className="text-xs text-gray-600">Throttle</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live' && <LiveTuningPanel />}
      </div>
    </div>
  );
};
