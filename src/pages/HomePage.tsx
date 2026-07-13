import React from 'react';
import { useStore } from '@/hooks/useStore';
import { ENGINE_SPECS, INJECTOR_DATABASE } from '@/lib/engineData';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import {
  Car, Zap, Activity, Settings,
  Thermometer, Gauge, AlertTriangle, CheckCircle,
  Fuel, Brain, FileText, Cable, ZapOff, Play
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { profile, currentMap, liveData, obd2, setActiveScreen, setShowFlashModal } = useStore();
  const engineSpec = ENGINE_SPECS[profile.engine];
  const injectorSpec = INJECTOR_DATABASE[profile.injector];
  const estimatedHp = currentMap ? aiTuningEngine.estimateMapHp(profile.engine, currentMap.id) : 0;
  const estimatedTq = currentMap ? aiTuningEngine.estimateMapTorque(profile.engine, currentMap.id) : 0;

  const quickActions = [
    { id: 'gauges', label: 'Gauges', icon: Gauge, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'tuning', label: 'AI Tuning', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'ai', label: 'AI Analysis', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'logs', label: 'Data Logs', icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  const ecuOnline = obd2.ecus.filter(e => e.status === 'online').length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-auto">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">BMW E60 Coder Pro</h1>
              <div className="flex items-center gap-2 text-xs">
                {obd2.connectionState === 'connected' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400">Connected</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">{obd2.protocol.toUpperCase()}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-green-400 font-mono">{obd2.batteryVoltage.toFixed(1)}V</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-red-400">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {obd2.connectionState === 'connected' && (
              <button
                onClick={() => setShowFlashModal(true)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-2 rounded-lg transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Flash
              </button>
            )}
            <button
              onClick={() => setActiveScreen('settings')}
              className="w-10 h-10 rounded-xl bg-[#161b22] flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Connection Status Card */}
        <div className={`rounded-xl p-4 border ${
          obd2.connectionState === 'connected'
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {obd2.connectionState === 'connected' ? (
                <Cable className="w-5 h-5 text-green-400" />
              ) : (
                <ZapOff className="w-5 h-5 text-red-400" />
              )}
              <div>
                <div className={`text-sm font-semibold ${obd2.connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  {obd2.connectionState === 'connected' ? 'K+DCAN Cable Connected' : 'No Cable Connected'}
                </div>
                <div className="text-xs text-gray-500">
                  {obd2.connectionState === 'connected'
                    ? `${obd2.cable?.type === 'k_dcan_ftdi' ? 'FTDI FT232' : obd2.cable?.type === 'k_dcan_ch340' ? 'CH340' : 'ENET'} | ${ecuOnline} ECUs online`
                    : 'Connect K+DCAN cable via USB OTG'
                  }
                </div>
              </div>
            </div>
            {obd2.connectionState === 'connected' && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Protocol</div>
                <div className="text-sm font-mono text-green-400">{obd2.dmeProtocolVersion}</div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vehicle Profile</h2>
            <span className="text-xs text-gray-500">{profile.vin}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Engine</div>
              <div className="text-sm font-semibold text-white">{engineSpec.fullName}</div>
              <div className="text-xs text-gray-500">{engineSpec.stockPower}hp / {engineSpec.stockTorque}Nm stock</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Current Map</div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentMap?.color || '#4CAF50' }} />
                <span className="text-sm font-semibold text-white">{currentMap?.name || 'Stock'}</span>
              </div>
              <div className="text-xs text-gray-500">~{estimatedHp}hp / {estimatedTq}Nm</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Injector</div>
              <div className="text-sm font-semibold text-white">{injectorSpec.name}</div>
              <div className="text-xs text-gray-500">{injectorSpec.flowRateCc}cc/min</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mileage</div>
              <div className="text-sm font-semibold text-white">{profile.mileage.toLocaleString()} km</div>
            </div>
          </div>
        </div>

        {/* Live Data */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-blue-400" /><span className="text-xs text-gray-500">RPM</span></div>
            <div className="text-xl font-mono text-white">{liveData.rpm.toLocaleString()}</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-1.5 mb-1"><Gauge className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs text-gray-500">Boost</span></div>
            <div className="text-xl font-mono text-orange-400">{liveData.boost.toFixed(2)}</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-1.5 mb-1"><Thermometer className="w-3.5 h-3.5 text-yellow-400" /><span className="text-xs text-gray-500">Coolant</span></div>
            <div className="text-xl font-mono text-white">{Math.round(liveData.coolantTemp)}°C</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-1.5 mb-1"><Fuel className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-gray-500">AFR</span></div>
            <div className="text-xl font-mono text-green-400">{liveData.afr.toFixed(2)}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => setActiveScreen(action.id)}
              className="bg-[#0d1117] rounded-xl p-4 border border-gray-800 hover:border-gray-600 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-white">{action.label}</span>
            </button>
          ))}
        </div>

        {/* ECU Status */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">ECU Status</h2>
          <div className="grid grid-cols-3 gap-2">
            {obd2.ecus.length > 0 ? obd2.ecus.map(ecu => (
              <div key={ecu.address} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                ecu.status === 'online' ? 'bg-green-500/5 text-green-400' :
                ecu.status === 'faulty' ? 'bg-yellow-500/5 text-yellow-400' :
                'bg-gray-800/30 text-gray-500'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  ecu.status === 'online' ? 'bg-green-400' :
                  ecu.status === 'faulty' ? 'bg-yellow-400' : 'bg-gray-600'
                }`} />
                <span className="flex-1 truncate">{ecu.name}</span>
                <span className="text-gray-600 font-mono text-[10px]">{ecu.address}</span>
                {ecu.faultCodes > 0 && <span className="text-red-400 text-[10px]">{ecu.faultCodes} fault{ecu.faultCodes > 1 ? 's' : ''}</span>}
              </div>
            )) : (
              <div className="col-span-3 text-center text-xs text-gray-600 py-2">
                Connect cable to scan ECUs
              </div>
            )}
          </div>
        </div>

        {/* Safety Score */}
        {currentMap && (
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Safety Score</h2>
              <span className={`text-lg font-bold ${currentMap.safetyScore >= 80 ? 'text-green-400' : currentMap.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {currentMap.safetyScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${currentMap.safetyScore >= 80 ? 'bg-green-500' : currentMap.safetyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${currentMap.safetyScore}%` }} />
            </div>
            {currentMap.safetyScore < 60 && (
              <div className="flex items-center gap-2 mt-2 text-yellow-400 text-xs">
                <AlertTriangle className="w-4 h-4" />
                Review hardware requirements for this map
              </div>
            )}
          </div>
        )}

        {/* Flash Status / Action */}
        {obd2.connectionState === 'connected' && currentMap && (
          <button
            onClick={() => setShowFlashModal(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
          >
            <Zap className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">Flash {currentMap.name} to DME</div>
              <div className="text-xs text-orange-200">~{estimatedHp}hp | {aiTuningEngine.estimateMapTorque(profile.engine, currentMap.id)}Nm</div>
            </div>
            <Play className="w-5 h-5 ml-auto" />
          </button>
        )}

        {/* Mods */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Installed Modifications</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Upgraded Intercooler', installed: profile.hasUpgradedIntercooler },
              { label: 'Upgraded Turbo(s)', installed: profile.hasUpgradedTurbo },
              { label: 'Upgraded Fuel Pump', installed: profile.hasUpgradedFuelPump },
              { label: 'Upgraded Clutch', installed: profile.hasUpgradedClutch },
              { label: 'Meth Injection', installed: profile.hasMethInjection },
              { label: 'Catless Downpipes', installed: profile.hasDownpipes },
              { label: 'Performance Exhaust', installed: profile.hasExhaust },
              { label: 'Upgraded Chargepipe', installed: profile.hasUpgradedChargepipe },
            ].map(mod => (
              <div key={mod.label} className="flex items-center gap-2">
                {mod.installed ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0" />}
                <span className={mod.installed ? 'text-white' : 'text-gray-600'}>{mod.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
