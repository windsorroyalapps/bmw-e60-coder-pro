import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { LiveTuningPanel } from '@/components/LiveTuningPanel';
import { ENGINE_SPECS, getInjectorsForEngine, calculateMaxHp, calculateRequiredInjectorCc } from '@/lib/engineData';
import {
  Cpu, Zap, Fuel, Gauge, Sparkles, AlertTriangle,
  Check, Info, TrendingUp, Activity
} from 'lucide-react';
import type { MapType, InjectorType } from '@/types';

const MAP_TYPES: { id: MapType; name: string; desc: string; color: string }[] = [
  { id: 'stock', name: 'Stock', desc: 'Factory calibration', color: 'bg-green-600' },
  { id: 'stage1', name: 'Stage 1', desc: 'Stock hardware optimized', color: 'bg-blue-600' },
  { id: 'stage2', name: 'Stage 2', desc: 'Bolt-ons required', color: 'bg-orange-600' },
  { id: 'stage2plus', name: 'Stage 2+', desc: 'Upgraded turbos/fuel', color: 'bg-orange-700' },
  { id: 'stage3', name: 'Stage 3', desc: 'Big turbo build', color: 'bg-red-600' },
  { id: 'custom', name: 'Custom', desc: 'User defined', color: 'bg-purple-600' },
  { id: 'economy', name: 'Economy', desc: 'Max fuel efficiency', color: 'bg-teal-600' },
  { id: 'valet', name: 'Valet', desc: 'Reduced power', color: 'bg-gray-600' },
  { id: 'anti_theft', name: 'Anti-Theft', desc: 'Engine disabled', color: 'bg-black' },
];

export const TuningPage: React.FC = () => {
  const { profile, currentMap, updateProfile, generateMap } = useStore();
  const [activeTab, setActiveTab] = useState<'maps' | 'injectors' | 'timing' | 'boost' | 'throttle' | 'live'>('maps');
  const [targetHp, setTargetHp] = useState(400);
  const [showInjectorCalc, setShowInjectorCalc] = useState(false);

  const engineSpec = ENGINE_SPECS[profile.engine];
  const availableInjectors = getInjectorsForEngine(profile.engine);
  const estimatedHp = currentMap ? aiTuningEngine.estimateMapHp(profile.engine, currentMap.id) : 0;
  const estimatedTq = currentMap ? aiTuningEngine.estimateMapTorque(profile.engine, currentMap.id) : 0;

  const handleMapSelect = (mapType: MapType) => {
    generateMap(mapType);
  };

  const handleInjectorSelect = (injector: InjectorType) => {
    updateProfile({ injector });
  };

  const requiredCc = calculateRequiredInjectorCc(targetHp, engineSpec.cylinders, 85, engineSpec.fuelType);

  const tabs = [
    { id: 'maps', label: 'Maps', icon: Cpu },
    { id: 'injectors', label: 'Injectors', icon: Fuel },
    { id: 'timing', label: 'Timing', icon: Zap },
    { id: 'boost', label: 'Boost', icon: TrendingUp },
    { id: 'throttle', label: 'Throttle', icon: Gauge },
    { id: 'live', label: 'Live Tune', icon: Activity },
  ];

  if (activeTab === 'live') {
    return <LiveTuningPanel />;
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              AI Tuning
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {engineSpec.fullName} | {engineSpec.stockPower}hp stock
            </p>
          </div>
          {currentMap && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Estimated Output</div>
              <div className="text-2xl font-bold text-white">
                {estimatedHp}<span className="text-sm text-gray-500 ml-1">hp</span>
                <span className="text-gray-600 mx-2">/</span>
                {estimatedTq}<span className="text-sm text-gray-500 ml-1">Nm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0d1117] border-b border-gray-800 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-400 border-blue-400 bg-blue-400/5'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'maps' && (
          <div className="space-y-4">
            {/* Safety Score */}
            {currentMap && (
              <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Safety Score</span>
                  <span className={`text-lg font-bold ${
                    currentMap.safetyScore >= 80 ? 'text-green-400' :
                    currentMap.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentMap.safetyScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      currentMap.safetyScore >= 80 ? 'bg-green-500' :
                      currentMap.safetyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentMap.safetyScore}%` }}
                  />
                </div>
                {currentMap.safetyScore < 60 && (
                  <div className="flex items-center gap-2 mt-2 text-yellow-400 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Safety score below 60. Review hardware requirements.
                  </div>
                )}
              </div>
            )}

            {/* Map Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {MAP_TYPES.map(map => {
                const isSupported = engineSpec.supportedMaps.includes(map.id);
                const isActive = currentMap?.id === map.id;
                return (
                  <button
                    key={map.id}
                    onClick={() => isSupported && handleMapSelect(map.id)}
                    disabled={!isSupported}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                        : isSupported
                          ? 'border-gray-700 bg-[#0d1117] hover:border-gray-600 hover:bg-gray-800/50'
                          : 'border-gray-800 bg-[#0a0a0a] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${map.color}`} />
                      <span className="font-semibold text-white">{map.name}</span>
                      {isActive && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-400">{map.desc}</p>
                    {isSupported && (
                      <div className="mt-2 text-xs text-gray-500">
                        ~{aiTuningEngine.estimateMapHp(profile.engine, map.id)}hp
                      </div>
                    )}
                    {!isSupported && (
                      <div className="mt-2 text-xs text-red-400">Not supported for {engineSpec.name}</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Map Details */}
            {currentMap && (
              <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  {currentMap.name} Map Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Rev Limit</div>
                    <div className="text-white font-mono">{currentMap.revLimit.toLocaleString()} RPM</div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Launch Control</div>
                    <div className="text-white font-mono">
                      {currentMap.launchControlRpm > 0 ? `${currentMap.launchControlRpm.toLocaleString()} RPM` : 'Off'}
                    </div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Soft Cut</div>
                    <div className="text-white font-mono">{currentMap.softCutRpm?.toLocaleString() ?? '-'} RPM</div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Hard Cut</div>
                    <div className="text-white font-mono">{currentMap.hardCutRpm?.toLocaleString() ?? '-'} RPM</div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Cooling</div>
                    <div className="text-white capitalize">{currentMap.coolingFanSpeed}</div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Speed Limit</div>
                    <div className="text-white font-mono">
                      {currentMap.speedLimit ? `${currentMap.speedLimit} km/h` : 'Unlimited'}
                    </div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Fuel Cut</div>
                    <div className="text-white">{currentMap.fuelCutEnabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-gray-500 text-xs">AI Generated</div>
                    <div className="text-blue-400">{currentMap.aiGenerated ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {currentMap.vanosIntake.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#161b22] rounded-lg p-3">
                      <div className="text-gray-500 text-xs mb-1">VANOS Intake (max)</div>
                      <div className="text-white font-mono">
                        {Math.max(...currentMap.vanosIntake.map(v => v.advance))} deg advance
                      </div>
                    </div>
                    <div className="bg-[#161b22] rounded-lg p-3">
                      <div className="text-gray-500 text-xs mb-1">VANOS Exhaust (max)</div>
                      <div className="text-white font-mono">
                        {Math.max(...currentMap.vanosExhaust.map(v => v.advance))} deg advance
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'injectors' && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  Injector Size Calculator
                </h3>
                <button
                  onClick={() => setShowInjectorCalc(!showInjectorCalc)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showInjectorCalc ? 'Hide' : 'Show'}
                </button>
              </div>

              {showInjectorCalc && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Target Horsepower</label>
                    <input
                      type="range"
                      min={engineSpec.stockPower}
                      max={engineSpec.maxSafePower}
                      value={targetHp}
                      onChange={(e) => setTargetHp(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{engineSpec.stockPower}hp</span>
                      <span className="text-blue-400 font-bold">{targetHp}hp</span>
                      <span>{engineSpec.maxSafePower}hp</span>
                    </div>
                  </div>

                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Required Injector Size</div>
                    <div className="text-xl font-bold text-white font-mono">
                      {requiredCc} cc/min
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Based on {engineSpec.cylinders} cylinders @ 85% duty cycle with {engineSpec.fuelType}
                    </div>
                  </div>

                  <div className="bg-[#161b22] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Recommended Options</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableInjectors
                        .filter(i => i.flowRateCc >= requiredCc * 0.8 && i.flowRateCc <= requiredCc * 1.5)
                        .slice(0, 4)
                        .map(i => (
                          <span key={i.id} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                            {i.name} ({i.flowRateCc}cc)
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {availableInjectors.map(injector => {
                const isActive = profile.injector === injector.id;
                const maxHp = calculateMaxHp(injector.flowRateCc, 85, engineSpec.cylinders, engineSpec.fuelType);
                return (
                  <button
                    key={injector.id}
                    onClick={() => handleInjectorSelect(injector.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-800 bg-[#0d1117] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-blue-400' : 'bg-gray-600'}`} />
                        <div>
                          <div className="font-semibold text-white">{injector.name}</div>
                          <div className="text-xs text-gray-400">{injector.brand} | {injector.impedance} impedance</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white font-mono">{injector.flowRateCc}cc</div>
                        <div className="text-xs text-gray-500">~{maxHp}hp max</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{injector.notes}</div>
                    {injector.requiresResistorDelete && (
                      <div className="mt-1 text-xs text-orange-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Requires resistor delete
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'timing' && currentMap && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Ignition Timing Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left p-1.5">RPM \ Load</th>
                      {[20, 40, 60, 80, 100].map(l => (
                        <th key={l} className="p-1.5 text-center">{l}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[2000, 3000, 4000, 5000, 6000].map(rpm => (
                      <tr key={rpm} className="border-t border-gray-800">
                        <td className="p-1.5 text-gray-400 font-mono">{rpm}</td>
                        {[20, 40, 60, 80, 100].map(load => {
                          const entry = currentMap.timing.find(t => t.rpm === rpm && t.loadPercent === load);
                          return (
                            <td key={load} className="p-1.5 text-center">
                              {entry ? (
                                <span className={`font-mono ${
                                  entry.knockRetard > 0 ? 'text-red-400' : 'text-white'
                                }`}>
                                  {entry.ignitionAdvance.toFixed(1)} deg
                                </span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-white mb-3">Timing by RPM @ 80% Load</h3>
              <div className="flex items-end gap-1 h-32">
                {currentMap.timing
                  .filter(t => t.loadPercent === 80)
                  .filter(t => [1000, 2000, 3000, 4000, 5000, 6000, 7000].includes(t.rpm))
                  .map(t => (
                    <div key={t.rpm} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500/60 rounded-t"
                        style={{ height: `${(t.ignitionAdvance / 40) * 100}%` }}
                      />
                      <span className="text-xs text-gray-500 font-mono">{t.rpm}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'boost' && currentMap && (
          <div className="space-y-4">
            {currentMap.boost ? (
              <>
                <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
                  <h3 className="font-semibold text-white mb-3">Boost Table</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left p-2">RPM</th>
                          <th className="p-2 text-center">Target (bar)</th>
                          <th className="p-2 text-center">WG Duty (%)</th>
                          <th className="p-2 text-center">Overboost (bar)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMap.boost.map(b => (
                          <tr key={b.rpm} className="border-t border-gray-800">
                            <td className="p-2 text-gray-400 font-mono">{b.rpm}</td>
                            <td className="p-2 text-center text-orange-400 font-mono">{b.targetBoost.toFixed(2)}</td>
                            <td className="p-2 text-center text-white font-mono">{b.wastegateDuty}%</td>
                            <td className="p-2 text-center text-red-400 font-mono">{b.overboost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {currentMap.gearBasedBoost && (
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
                    <h3 className="font-semibold text-white mb-3">Gear-Based Boost</h3>
                    <div className="grid grid-cols-6 gap-2">
                      {currentMap.gearBasedBoost.map(g => (
                        <div key={g.gear} className="bg-[#161b22] rounded-lg p-2 text-center">
                          <div className="text-xs text-gray-500">Gear {g.gear}</div>
                          <div className="text-sm font-mono text-orange-400">{g.boost.toFixed(2)}</div>
                          <div className="text-xs text-gray-600">bar</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Boost control not available for naturally aspirated engines
              </div>
            )}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default TuningPage;
