import React from 'react';
import { useStore } from '@/hooks/useStore';
import { CircularGauge } from './CircularGauge';
import { Activity, Square, ChevronDown } from 'lucide-react';

const GAUGE_TYPE_MAP: Record<string, { key: string; color?: string }> = {
  rpm: { key: 'rpm', color: '#00e5ff' },
  boost: { key: 'boost', color: '#ff6d00' },
  coolant_temp: { key: 'coolantTemp' },
  oil_temp: { key: 'oilTemp' },
  oil_pressure: { key: 'oilPressure' },
  afr: { key: 'afr', color: '#76ff03' },
  iat: { key: 'iat' },
  speed: { key: 'speed' },
  throttle: { key: 'throttle', color: '#e040fb' },
  load: { key: 'load' },
  timing: { key: 'timing' },
  fuel_pressure: { key: 'fuelPressure' },
  battery: { key: 'battery' },
  knock: { key: 'knock', color: '#ff1744' },
  lambda: { key: 'lambda' },
  map_pressure: { key: 'mapPressure' },
  turbine_inlet: { key: 'turbineInlet', color: '#ff3d00' },
  turbine_outlet: { key: 'turbineOutlet', color: '#ff9100' },
  duty_cycle: { key: 'dutyCycle' },
  fuel_trim_short: { key: 'fuelTrimShort' },
  fuel_trim_long: { key: 'fuelTrimLong' },
  maf: { key: 'maf' },
  tq_actual: { key: 'tqActual', color: '#00e5ff' },
  tq_requested: { key: 'tqRequested' },
};

export const GaugeDashboard: React.FC = () => {
  const {
    liveData,
    gaugeLayouts,
    activeGaugeLayout,
    setActiveGaugeLayout,
    isLogging,
    startSession,
    stopSession,
    currentSession,
  } = useStore();

  const layout = gaugeLayouts.find(l => l.id === activeGaugeLayout) || gaugeLayouts[0];

  const getGaugeValue = (gaugeType: string): number => {
    const mapping = GAUGE_TYPE_MAP[gaugeType];
    if (!mapping) return 0;
    return (liveData as any)[mapping.key] ?? 0;
  };

  const getGaugeColor = (gaugeType: string): string | undefined => {
    return GAUGE_TYPE_MAP[gaugeType]?.color;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={activeGaugeLayout}
              onChange={(e) => setActiveGaugeLayout(e.target.value)}
              className="appearance-none bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {gaugeLayouts.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          
          {isLogging && (
            <div className="flex items-center gap-2 text-red-400 animate-pulse">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-mono">
                REC {currentSession?.entries.length ?? 0}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLogging ? (
            <button
              onClick={stopSession}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => startSession(`Log_${new Date().toISOString().slice(11, 19)}`)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Log
            </button>
          )}
        </div>
      </div>

      {/* Gauge Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-12 gap-3 auto-rows-fr">
          {layout.gauges.map(gauge => (
            <div
              key={gauge.id}
              className="col-span-3 flex items-center justify-center bg-[#0d1117] rounded-xl border border-gray-800/50 p-2"
              style={{
                gridColumn: `span ${gauge.position.w}`,
                gridRow: `span ${gauge.position.h}`,
              }}
            >
              <CircularGauge
                value={getGaugeValue(gauge.type)}
                min={gauge.min}
                max={gauge.max}
                warningThreshold={gauge.warningThreshold}
                dangerThreshold={gauge.dangerThreshold}
                unit={gauge.unit}
                label={gauge.label}
                size={gauge.position.w >= 6 ? 220 : gauge.position.w >= 4 ? 170 : 130}
                color={getGaugeColor(gauge.type)}
                showPeak={true}
                peakValue={currentSession ? Math.max(
                  ...(currentSession.entries
                    .map(e => (e.data as any)?.[GAUGE_TYPE_MAP[gauge.type]?.key])
                    .filter(v => v !== undefined) as number[]),
                  getGaugeValue(gauge.type)
                ) : getGaugeValue(gauge.type)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-t border-gray-800 text-xs text-gray-500">
        <div className="flex gap-4">
          <span>RPM: <span className="text-white font-mono">{liveData.rpm.toLocaleString()}</span></span>
          <span>Boost: <span className="text-orange-400 font-mono">{liveData.boost.toFixed(2)} bar</span></span>
          <span>Load: <span className="text-white font-mono">{liveData.load}%</span></span>
        </div>
        <div className="flex gap-4">
          <span>IAT: <span className="font-mono">{Math.round(liveData.iat)}°C</span></span>
          <span>AFR: <span className="font-mono">{liveData.afr.toFixed(2)} λ</span></span>
        </div>
      </div>
    </div>
  );
};

export default GaugeDashboard;
