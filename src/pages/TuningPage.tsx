import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { ENGINE_SPECS, INJECTOR_DATABASE, getInjectorsForEngine, calculateMaxHp, calculateRequiredInjectorCc } from '@/lib/engineData';
import { LiveTuningPanel } from '@/components/LiveTuningPanel';
import {
  Cpu, Zap, Fuel, Gauge, Sparkles, AlertTriangle,
  Check, Info, TrendingUp, Activity
} from 'lucide-react';
import type { MapType, InjectorType } from '@/types';

const MAP_PRESETS: Record<MapType, { name: string; description: string; hpGain: number; safety: 'safe' | 'moderate' | 'aggressive' }> = {
  stock: { name: 'Stock', description: 'Factory BMW calibration', hpGain: 0, safety: 'safe' },
  stage1: { name: 'Stage 1', description: '+40hp, requires 93 octane', hpGain: 40, safety: 'safe' },
  stage2: { name: 'Stage 2', description: '+80hp, requires bolt-ons', hpGain: 80, safety: 'moderate' },
  stage2plus: { name: 'Stage 2+', description: '+110hp, requires full bolt-ons', hpGain: 110, safety: 'moderate' },
  stage3: { name: 'Stage 3', description: 'Full bolt-ons + big turbo', hpGain: 160, safety: 'aggressive' },
  custom: { name: 'Custom', description: 'User-defined configuration', hpGain: 0, safety: 'moderate' },
  economy: { name: 'Economy', description: 'Maximum fuel efficiency', hpGain: -10, safety: 'safe' },
  valet: { name: 'Valet', description: 'Reduced power mode', hpGain: -100, safety: 'safe' },
  anti_theft: { name: 'Anti-Theft', description: 'Engine disabled', hpGain: -300, safety: 'safe' },
};

const INJECTOR_TYPES: Record<InjectorType, { name: string; cc: number; maxHp: number; type: string }> = {
  stock: { name: 'Stock N54', cc: 630, maxHp: 420, type: 'EV14' },
  bosch_550: { name: 'Bosch 550cc', cc: 550, maxHp: 450, type: 'Bosch' },
  bosch_650: { name: 'Bosch 650cc', cc: 650, maxHp: 500, type: 'Bosch' },
  bosch_750: { name: 'Bosch 750cc', cc: 750, maxHp: 550, type: 'Bosch' },
  bosch_850: { name: 'Bosch 850cc', cc: 850, maxHp: 600, type: 'Bosch' },
  bosch_1000: { name: 'Bosch 1000cc', cc: 1000, maxHp: 750, type: 'Bosch' },
  bosch_1200: { name: 'Bosch 1200cc', cc: 1200, maxHp: 900, type: 'Bosch' },
  ev14_550: { name: 'EV14 550cc', cc: 550, maxHp: 450, type: 'EV14' },
  ev14_650: { name: 'EV14 650cc', cc: 650, maxHp: 500, type: 'EV14' },
  ev14_750: { name: 'EV14 750cc', cc: 750, maxHp: 550, type: 'EV14' },
  ev14_850: { name: 'EV14 850cc', cc: 850, maxHp: 600, type: 'EV14' },
  ev14_1000: { name: 'EV14 1000cc', cc: 1000, maxHp: 700, type: 'EV14' },
  injector_dynamics_725: { name: 'ID725', cc: 725, maxHp: 500, type: 'Injector Dynamics' },
  injector_dynamics_850: { name: 'ID850', cc: 850, maxHp: 600, type: 'Injector Dynamics' },
  injector_dynamics_1000: { name: 'ID1000', cc: 1000, maxHp: 700, type: 'Injector Dynamics' },
  injector_dynamics_1300: { name: 'ID1300', cc: 1300, maxHp: 850, type: 'Injector Dynamics' },
  injector_dynamics_1700: { name: 'ID1700', cc: 1700, maxHp: 1100, type: 'Injector Dynamics' },
  siemens_deka_60lb: { name: 'Siemens Deka 60lb', cc: 630, maxHp: 420, type: 'Siemens' },
  siemens_deka_80lb: { name: 'Siemens Deka 80lb', cc: 840, maxHp: 600, type: 'Siemens' },
};

export const TuningPage: React.FC = () => {
  const { profile, setProfile, aiRecommendations } = useStore();
  const [activeTab, setActiveTab] = useState<'maps' | 'injectors' | 'timing' | 'boost' | 'throttle' | 'live'>('maps');
  const [selectedInjector, setSelectedInjector] = useState<InjectorType>('stock');

  const engineSpec = ENGINE_SPECS[profile.engine];
  const generatedMap = aiTuningEngine.generateMap(profile.engine, profile.currentMap as MapType, selectedInjector, profile);
  const injectors = getInjectorsForEngine(profile.engine);
  const maxHp = calculateMaxHp(INJECTOR_DATABASE[selectedInjector]?.flowRateCc || 630, 85, engineSpec.cylinders, engineSpec.fuelType);
  const requiredCc = calculateRequiredInjectorCc(maxHp, engineSpec.cylinders, 0.85, engineSpec.fuelType);

  const tabs = [
    { id: 'maps' as const, label: 'Maps', icon: Cpu },
    { id: 'injectors' as const, label: 'Injectors', icon: Fuel },
    { id: 'timing' as const, label: 'Timing', icon: Zap },
    { id: 'boost' as const, label: 'Boost', icon: TrendingUp },
    { id: 'throttle' as const, label: 'Throttle', icon: Gauge },
    { id: 'live' as const, label: 'Live Tune', icon: Activity },
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
              onClick={() => setActiveTab(tab.id)}
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
                  {aiRecommendations.slice(0, 3).map((rec: any) => (
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
                {injectors.map((inj) => {
                  const injType = INJECTOR_TYPES[inj.id as InjectorType];
                  const isActive = selectedInjector === inj.id;
                  return (
                    <button
                      key={inj.id}
                      onClick={() => setSelectedInjector(inj.id as InjectorType)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{inj.name}</div>
                        <div className="text-xs text-gray-500">{inj.brand}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-400 font-mono">{inj.flowRateCc}cc</div>
                        <div className="text-xs text-gray-500">~{injType?.maxHp || '?'}hp max</div>
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
              {(INJECTOR_DATABASE[selectedInjector]?.flowRateCc || 0) < requiredCc && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Current injectors may be too small for full potential
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timing Maps */}
        {activeTab === 'timing' && generatedMap.timing && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Ignition Timing Map</h3>
              <div className="grid grid-cols-6 gap-1">
                {generatedMap.timing.slice(0, 30).map((t, i) => (
                  <div key={i} className="bg-[#161b22] rounded p-1 text-center">
                    <div className="text-[10px] text-gray-600">{t.rpm}</div>
                    <div className="text-sm font-mono text-yellow-400">{t.ignitionAdvance}deg</div>
                    <div className="text-[10px] text-gray-600">{t.loadPercent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Boost Maps */}
        {activeTab === 'boost' && generatedMap.boost && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Boost Target Map</h3>
              <div className="flex items-end gap-1 h-40">
                {generatedMap.boost.map(b => (
                  <div key={b.rpm} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500/60 rounded-t"
                      style={{ height: `${Math.min((b.targetBoost / 2.5) * 100, 100)}%` }}
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
        {activeTab === 'throttle' && generatedMap.throttle && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Throttle Map: {generatedMap.throttle[0]?.mode}</h3>
              <div className="flex items-end gap-0.5 h-40">
                {generatedMap.throttle.map(t => (
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

            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Throttle Response Table</h3>
              <div className="grid grid-cols-5 gap-2">
                {generatedMap.throttle.filter(t => t.pedalPercent % 20 === 0).map(t => (
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
