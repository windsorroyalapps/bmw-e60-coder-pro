import React from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import { ENGINE_SPECS } from '@/lib/engineData';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import {
  Car, Zap, Activity, Settings,
  Thermometer, Gauge,
  Fuel, Brain, FileText, Cable, ZapOff, Power, PowerOff
} from 'lucide-react';
import type { MapType } from '@/types';

export const HomePage: React.FC = () => {
  const { profile, liveData, obd2, setActiveScreen, setShowFlashModal, setShowAdapterSettings } = useStore();
  const engineSpec = ENGINE_SPECS[profile.engine];
  const currentMapId = profile.currentMap as MapType;
  const estimatedHp = aiTuningEngine.estimateMapHp(profile.engine, currentMapId);
  const estimatedTq = aiTuningEngine.estimateMapTorque(profile.engine, currentMapId);

  const quickActions = [
    { id: 'gauges', label: 'Gauges', icon: Gauge, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'tuning', label: 'AI Tuning', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'ai', label: 'AI Analysis', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'logs', label: 'Data Logs', icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  const ecuOnline = obd2.ecus.filter(e => e.status === 'online').length;

  const handleConnect = async () => {
    if (obd2.connectionState === 'connected') {
      obd2Manager.disconnect();
    } else {
      const cable = await obd2Manager.detectCable();
      if (cable) {
        const adapterType = cable.type.includes('ELM327') ? 'ELM327' : 'AUTO';
        obd2Manager.connect(adapterType);
      } else {
        setShowAdapterSettings(true);
      }
    }
  };

  const getCableDisplayName = () => {
    if (!obd2.cable) return 'No Cable';
    const t = obd2.cable.type;
    if (t.includes('FTDI')) return 'FTDI K+DCAN';
    if (t.includes('CH340')) return 'CH340 K+DCAN';
    if (t.includes('CP2102')) return 'CP2102 K+DCAN';
    if (t.includes('PL2303')) return 'PL2303 K+DCAN';
    if (t.includes('ELM327')) return 'ELM327 Adapter';
    if (t.includes('ENET')) return 'ENET Cable';
    return t;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-auto">
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
                ) : obd2.connectionState === 'connecting' || obd2.connectionState === 'handshaking' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-yellow-400">Connecting...</span>
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
              onClick={handleConnect}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors ${
                obd2.connectionState === 'connected'
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                  : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              }`}
            >
              {obd2.connectionState === 'connected' ? (
                <><PowerOff className="w-3.5 h-3.5" /> Disconnect</>
              ) : (
                <><Power className="w-3.5 h-3.5" /> Connect</>
              )}
            </button>
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
        <div className={`rounded-xl p-4 border ${
          obd2.connectionState === 'connected'
            ? 'bg-green-500/5 border-green-500/20'
            : obd2.connectionState === 'connecting' || obd2.connectionState === 'handshaking'
            ? 'bg-yellow-500/5 border-yellow-500/20'
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
                <div className={`text-sm font-semibold ${
                  obd2.connectionState === 'connected' ? 'text-green-400' :
                  obd2.connectionState === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {obd2.connectionState === 'connected' ? `${getCableDisplayName()} Connected` :
                   obd2.connectionState === 'connecting' ? 'Connecting...' :
                   obd2.connectionState === 'handshaking' ? 'Handshaking...' :
                   'No Cable Connected'}
                </div>
                <div className="text-xs text-gray-500">
                  {obd2.connectionState === 'connected'
                    ? `${getCableDisplayName()} | ${ecuOnline} ECUs online`
                    : obd2.lastError || 'Connect K+DCAN cable via USB OTG'
                  }
                </div>
              </div>
            </div>
            {obd2.connectionState === 'connected' && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Protocol</div>
                <div className="text-sm font-mono text-green-400">{obd2.dmeProtocolVersion || 'BMW_UDS'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vehicle Profile</h2>
            <span className="text-xs text-gray-500">{profile.year || '2008'}</span>
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
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentMapId === 'stock' ? '#4CAF50' : currentMapId === 'economy' ? '#009688' : currentMapId === 'valet' ? '#607D8B' : '#FF9800' }} />
                <span className="text-sm font-semibold text-white capitalize">{currentMapId || 'Stock'}</span>
              </div>
              <div className="text-xs text-gray-500">~{estimatedHp}hp / {estimatedTq}Nm</div>
            </div>
          </div>
        </div>

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
            <div className="text-xl font-mono text-white">{Math.round(liveData.coolantTemp)}C</div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-1.5 mb-1"><Fuel className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-gray-500">AFR</span></div>
            <div className="text-xl font-mono text-green-400">{liveData.afr.toFixed(2)}</div>
          </div>
        </div>

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
                {ecu.faultCodes > 0 && <span className="text-red-400 text-[10px]">{ecu.faultCodes}</span>}
              </div>
            )) : (
              <div className="col-span-3 text-center text-gray-600 text-xs py-2">
                No ECUs detected. Connect to vehicle to scan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
