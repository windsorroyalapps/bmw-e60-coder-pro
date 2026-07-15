import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import {
  CircleDot, WifiOff, Plug, Unplug, Zap,
  Battery, AlertTriangle, Loader,
  ChevronDown, ChevronUp, Cpu, Shield, ShieldOff,
  HeartPulse, Settings2
} from 'lucide-react';

export const ConnectionBar: React.FC = () => {
  const {
    obd2, setObd2, setObd2Cable, setShowFlashModal,
    watchdogEnabled, setWatchdogEnabled, connectionDead,
    autoReconnectAttempts, maxAutoReconnectAttempts,
    setShowAdapterSettings, selectedAdapterId,
  } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    const cable = await obd2Manager.detectCable();
    if (cable) {
      setObd2Cable(cable);
      const success = await obd2Manager.connect();
      if (success) {
        const state = obd2Manager.getState();
        setObd2(state);
      }
    }
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    obd2Manager.disconnect();
    setObd2(obd2Manager.getState());
    setObd2Cable(null);
  };

  const getStateColor = () => {
    switch (obd2.connectionState) {
      case 'connected': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'connecting':
      case 'handshaking':
      case 'searching': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-500 bg-gray-800/50 border-gray-700';
    }
  };

  const getStateIcon = () => {
    switch (obd2.connectionState) {
      case 'connected': return <CircleDot className="w-4 h-4 text-green-400 animate-pulse" />;
      case 'connecting':
      case 'handshaking':
      case 'searching': return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStateLabel = () => {
    switch (obd2.connectionState) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'handshaking': return 'Handshaking...';
      case 'searching': return 'Searching...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  const ecuOnline = obd2.ecus.filter(e => e.status === 'online').length;
  const ecuTotal = obd2.ecus.length;

  return (
    <div className="bg-[#0d1117] border-b border-gray-800">
      {/* Main Bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Left: Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${getStateColor()}`}>
          {getStateIcon()}
          <span>{getStateLabel()}</span>
          {obd2.connectionState === 'connected' && obd2.cable && (
            <span className="text-gray-400 ml-1">
              {obd2.cable.type === 'k_dcan_ftdi' ? 'FTDI' : obd2.cable.type === 'k_dcan_ch340' ? 'CH340' : 'ENET'}
            </span>
          )}
        </div>

        {/* Battery */}
        {obd2.connectionState === 'connected' && (
          <div className="flex items-center gap-1.5 text-xs">
            <Battery className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 font-mono">{obd2.batteryVoltage.toFixed(1)}V</span>
          </div>
        )}

        {/* ECU Count */}
        {obd2.connectionState === 'connected' && (
          <div className="flex items-center gap-1.5 text-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-400">{ecuOnline}/{ecuTotal} ECUs</span>
          </div>
        )}

        {/* Watchdog */}
        {obd2.connectionState === 'connected' && (
          <div className="flex items-center gap-2">
            {connectionDead ? (
              <div className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 animate-pulse">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>DEAD</span>
                {autoReconnectAttempts > 0 && (
                  <span className="text-gray-400">({autoReconnectAttempts}/{maxAutoReconnectAttempts})</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setWatchdogEnabled(!watchdogEnabled)}
                title={watchdogEnabled ? 'Watchdog active (500ms)' : 'Watchdog disabled'}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                  watchdogEnabled
                    ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                    : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {watchdogEnabled ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                <span className="hidden sm:inline">{watchdogEnabled ? 'WD' : 'WD Off'}</span>
              </button>
            )}
          </div>
        )}

        {/* Center: Connect/Disconnect Button */}
        <div className="mx-auto flex items-center gap-2">
          {/* OBD2 Settings Button */}
          <button
            onClick={() => setShowAdapterSettings(true)}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
            title="OBD2 Adapter Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OBD2</span>
            {selectedAdapterId && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </button>

          {/* Connect/Disconnect */}
          {obd2.connectionState === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs px-4 py-1.5 rounded-lg transition-colors border border-red-500/20"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs px-4 py-1.5 rounded-lg transition-colors"
            >
              {isConnecting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}

          {/* Scan Button (when disconnected) */}
          {obd2.connectionState === 'disconnected' && !isConnecting && (
            <button
              onClick={() => setShowAdapterSettings(true)}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
              title="Scan for adapters"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          )}

          {/* Flash Button */}
          {obd2.connectionState === 'connected' && (
            <button
              onClick={() => setShowFlashModal(true)}
              className="flex items-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-orange-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Flash
            </button>
          )}
        </div>

        {/* Right: Expand */}
        {obd2.connectionState === 'connected' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-white transition-colors ml-2"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded ECU List */}
      {expanded && obd2.connectionState === 'connected' && (
        <div className="px-4 pb-3 border-t border-gray-800/50 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {obd2.ecus.map(ecu => (
              <div
                key={ecu.address}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  ecu.status === 'online' ? 'bg-green-500/5 text-green-400' :
                  ecu.status === 'faulty' ? 'bg-yellow-500/5 text-yellow-400' :
                  'bg-gray-800/30 text-gray-500'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  ecu.status === 'online' ? 'bg-green-400' :
                  ecu.status === 'faulty' ? 'bg-yellow-400' :
                  'bg-gray-600'
                }`} />
                <span className="flex-1 truncate">{ecu.name}</span>
                <span className="text-gray-600 font-mono text-[10px]">{ecu.address}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionBar;
