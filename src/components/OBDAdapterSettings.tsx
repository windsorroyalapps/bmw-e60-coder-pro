import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import {
  Usb, Search, Check, ChevronLeft, Settings2, Zap,
  Shield, Gauge, Clock, Cable, Cpu, Activity,
  Loader, AlertTriangle, CheckCircle2
} from 'lucide-react';
import type { AdapterConfig } from '@/types';

const ADAPTER_LIST: AdapterConfig[] = [
  {
    id: 'inpa_ftdi', name: 'BMW INPA K+DCAN (FTDI)', chip: 'FT232R',
    vid: '0x0403', pid: '0x6001', type: 'k_dcan_ftdi', isGenuine: true,
    baudRate: 10400, ftdiLatencyTimer: 2, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000,
    description: 'Genuine BMW INPA cable with FTDI FT232R chip. Most reliable for K-Line/D-CAN.',
  },
  {
    id: 'ftdi_ft232h', name: 'FTDI FT232H K+DCAN', chip: 'FT232H',
    vid: '0x0403', pid: '0x6014', type: 'k_dcan_ftdi', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 1, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000,
    description: 'High-speed FTDI FT232H chip. Supports both K-Line and D-CAN with bus switching.',
  },
  {
    id: 'ch340', name: 'K+DCAN Clone (CH340)', chip: 'CH340',
    vid: '0x1A86', pid: '0x7523', type: 'k_dcan_ch340', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 16, dtrRtsMode: 'kline',
    protocolPreference: 'kline', connectTimeout: 8000,
    testerPresentInterval: 2500,
    description: 'Common clone cable with CH340 chip. Slower latency timer, best for K-Line only.',
  },
  {
    id: 'ch341', name: 'K+DCAN Clone (CH341A)', chip: 'CH341A',
    vid: '0x1A86', pid: '0x5523', type: 'k_dcan_ch340', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 16, dtrRtsMode: 'kline',
    protocolPreference: 'kline', connectTimeout: 8000,
    testerPresentInterval: 2500,
    description: 'CH341A variant clone cable. May have timing issues with D-CAN.',
  },
  {
    id: 'enet_cp2102', name: 'ENET Cable (CP2102)', chip: 'CP2102',
    vid: '0x10C4', pid: '0xEA60', type: 'enet', isGenuine: false,
    baudRate: 1000000, ftdiLatencyTimer: 16, dtrRtsMode: 'none',
    protocolPreference: 'dcan', connectTimeout: 3000,
    testerPresentInterval: 2000,
    description: 'ENET adapter with Silicon Labs CP2102. For Ethernet-based diagnostics only.',
  },
  {
    id: 'bmw_enet', name: 'BMW ENET (Ethernet)', chip: 'N/A',
    vid: '0x0000', pid: '0x0000', type: 'enet', isGenuine: true,
    baudRate: 1000000, ftdiLatencyTimer: 16, dtrRtsMode: 'none',
    protocolPreference: 'dcan', connectTimeout: 3000,
    testerPresentInterval: 2000,
    description: 'Direct Ethernet ENET cable for F-series+ compatible E60. Requires RJ45 adapter.',
  },
  {
    id: 'custom', name: 'Custom Adapter', chip: 'Unknown',
    vid: '0x0000', pid: '0x0000', type: 'k_dcan_ftdi', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 2, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000,
    description: 'Manually configured adapter. Set VID/PID and parameters to match your cable.',
  },
];

export const OBDAdapterSettings: React.FC = () => {
  const {
    selectedAdapterId, setSelectedAdapterId,
    adapterConfigs, updateAdapterConfig,
    setShowAdapterSettings, scannedAdapter, setScannedAdapter,
    addNotification,
  } = useStore();

  const [scanning, setScanning] = useState(false);
  const [expandedAdapter, setExpandedAdapter] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setScannedAdapter(null);
    try {
      const cable = await obd2Manager.detectCable();
      if (cable) {
        setScannedAdapter(cable);
        // Auto-match to adapter preset
        const matched = ADAPTER_LIST.find(a =>
          a.vid.toLowerCase() === cable.vendorId.toLowerCase() &&
          a.pid.toLowerCase() === cable.productId.toLowerCase()
        );
        if (matched) {
          setSelectedAdapterId(matched.id);
          addNotification({
            message: `Detected: ${cable.detectedChip} (${cable.vendorId}:${cable.productId}) - ${matched.name} selected`,
            type: 'success',
          });
        } else {
          setSelectedAdapterId('custom');
          // Update custom with detected VID/PID
          updateAdapterConfig('custom', {
            vid: cable.vendorId,
            pid: cable.productId,
            chip: cable.detectedChip,
            name: `Custom (${cable.detectedChip})`,
          });
          addNotification({
            message: `Unknown adapter detected: ${cable.detectedChip} (${cable.vendorId}:${cable.productId}). Custom preset selected.`,
            type: 'warning',
          });
        }
      } else {
        addNotification({
          message: 'No OBD adapter detected. Check USB OTG connection and cable.',
          type: 'error',
        });
      }
    } catch (e) {
      addNotification({
        message: 'Scan failed: ' + (e as Error).message,
        type: 'error',
      });
    }
    setScanning(false);
  };

  const handleSelect = (id: string) => {
    setSelectedAdapterId(id);
    // Apply preset config from the adapter list
    const preset = ADAPTER_LIST.find(a => a.id === id);
    if (preset) {
      updateAdapterConfig(id, preset);
    }
  };

  const config = selectedAdapterId ? adapterConfigs[selectedAdapterId] : null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <button
          onClick={() => setShowAdapterSettings(false)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Usb className="w-5 h-5 text-blue-400" />
          OBD Adapter Settings
        </h2>
        {selectedAdapterId && config && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-green-400">{config.name}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Scan Section */}
        <div className="p-4 border-b border-gray-800">
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-white">Auto-Detect Adapter</span>
              </div>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {scanning ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {scanning ? 'Scanning...' : 'Scan USB'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Connect your OBD adapter via USB OTG and tap Scan to auto-detect the chip and select the correct preset.
            </p>

            {/* Scan Result */}
            {scannedAdapter && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Adapter Detected
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Chip: <span className="text-white">{scannedAdapter.detectedChip}</span></div>
                  <div className="text-gray-400">Type: <span className="text-white">{scannedAdapter.type}</span></div>
                  <div className="text-gray-400">VID: <span className="text-white">{scannedAdapter.vendorId}</span></div>
                  <div className="text-gray-400">PID: <span className="text-white">{scannedAdapter.productId}</span></div>
                  <div className="text-gray-400">Baud: <span className="text-white">{scannedAdapter.baudRate}</span></div>
                  <div className="text-gray-400">Genuine: <span className={scannedAdapter.isGenuine ? 'text-green-400' : 'text-yellow-400'}>{scannedAdapter.isGenuine ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adapter List */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Cable className="w-4 h-4" />
            Select Adapter Preset
          </h3>

          <div className="space-y-2">
            {ADAPTER_LIST.map((adapter) => {
              const isSelected = selectedAdapterId === adapter.id;
              const isExpanded = expandedAdapter === adapter.id;
              const currentConfig = adapterConfigs[adapter.id] || adapter;

              return (
                <div
                  key={adapter.id}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {/* Adapter Row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => handleSelect(adapter.id)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                          {adapter.name}
                        </span>
                        {adapter.isGenuine && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                            Genuine
                          </span>
                        )}
                        {adapter.id === 'custom' && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{adapter.chip} | VID:{adapter.vid} PID:{adapter.pid}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{adapter.description}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedAdapter(isExpanded ? null : adapter.id);
                      }}
                      className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expandable Settings Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-700/50 px-3 pb-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Baud Rate */}
                        <div>
                          <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                            <Gauge className="w-3 h-3" /> Baud Rate
                          </label>
                          <select
                            value={currentConfig.baudRate}
                            onChange={(e) => updateAdapterConfig(adapter.id, { baudRate: Number(e.target.value) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value={5}>5 (5-baud init)</option>
                            <option value={9600}>9600</option>
                            <option value={10400}>10400 (K-Line)</option>
                            <option value={115200}>115200</option>
                            <option value={230400}>230400</option>
                            <option value={500000}>500000 (D-CAN)</option>
                            <option value={1000000}>1000000 (ENET)</option>
                          </select>
                        </div>

                        {/* FTDI Latency Timer */}
                        {currentConfig.type === 'k_dcan_ftdi' && (
                          <div>
                            <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" /> Latency Timer (ms)
                            </label>
                            <select
                              value={currentConfig.ftdiLatencyTimer}
                              onChange={(e) => updateAdapterConfig(adapter.id, { ftdiLatencyTimer: Number(e.target.value) })}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                            >
                              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => (
                                <option key={n} value={n}>{n}ms {n <= 2 ? '(Fast)' : n <= 8 ? '(Normal)' : '(Slow)'}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* DTR/RTS Mode */}
                        {currentConfig.type === 'k_dcan_ftdi' && (
                          <div>
                            <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                              <Activity className="w-3 h-3" /> Bus Mode
                            </label>
                            <select
                              value={currentConfig.dtrRtsMode}
                              onChange={(e) => updateAdapterConfig(adapter.id, { dtrRtsMode: e.target.value as 'kline' | 'dcan' | 'none' })}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="kline">K-Line (DTR=HIGH,RTS=LOW)</option>
                              <option value="dcan">D-CAN (DTR=LOW,RTS=HIGH)</option>
                            </select>
                          </div>
                        )}

                        {/* Protocol Preference */}
                        <div>
                          <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                            <Zap className="w-3 h-3" /> Protocol
                          </label>
                          <select
                            value={currentConfig.protocolPreference}
                            onChange={(e) => updateAdapterConfig(adapter.id, { protocolPreference: e.target.value as 'auto' | 'kline' | 'dcan' })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="auto">Auto (Try K-Line then D-CAN)</option>
                            <option value="kline">KWP2000 K-Line only</option>
                            <option value="dcan">UDS D-CAN only</option>
                          </select>
                        </div>

                        {/* Connect Timeout */}
                        <div>
                          <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" /> Timeout (ms)
                          </label>
                          <select
                            value={currentConfig.connectTimeout}
                            onChange={(e) => updateAdapterConfig(adapter.id, { connectTimeout: Number(e.target.value) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value={3000}>3s (Fast)</option>
                            <option value={5000}>5s (Normal)</option>
                            <option value={8000}>8s (Slow/Clone)</option>
                            <option value={15000}>15s (Troubleshoot)</option>
                          </select>
                        </div>

                        {/* Tester Present Interval */}
                        <div>
                          <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                            <Shield className="w-3 h-3" /> Keep-Alive (ms)
                          </label>
                          <select
                            value={currentConfig.testerPresentInterval}
                            onChange={(e) => updateAdapterConfig(adapter.id, { testerPresentInterval: Number(e.target.value) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value={1000}>1s (Aggressive)</option>
                            <option value={2000}>2s (Normal)</option>
                            <option value={2500}>2.5s (Clone-safe)</option>
                            <option value={5000}>5s (Relaxed)</option>
                          </select>
                        </div>

                        {/* Custom VID/PID for custom adapter */}
                        {adapter.id === 'custom' && (
                          <>
                            <div>
                              <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                                <Cpu className="w-3 h-3" /> Vendor ID
                              </label>
                              <input
                                type="text"
                                value={currentConfig.vid}
                                onChange={(e) => updateAdapterConfig(adapter.id, { vid: e.target.value })}
                                placeholder="0x0403"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                                <Cpu className="w-3 h-3" /> Product ID
                              </label>
                              <input
                                type="text"
                                value={currentConfig.pid}
                                onChange={(e) => updateAdapterConfig(adapter.id, { pid: e.target.value })}
                                placeholder="0x6001"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Reset to defaults */}
                      <button
                        onClick={() => {
                          const preset = ADAPTER_LIST.find(a => a.id === adapter.id);
                          if (preset) updateAdapterConfig(adapter.id, preset);
                        }}
                        className="mt-3 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Help / Info */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-400 space-y-1">
                <p className="text-yellow-400 font-medium">Adapter Selection Tips</p>
                <p>Not sure which cable you have? Tap <strong>Scan USB</strong> with the cable plugged in.</p>
                <p>Genuine BMW INPA cables use FTDI chips and work best with both K-Line and D-CAN.</p>
                <p>Clone cables (CH340/CH341) often struggle with D-CAN - select K-Line only.</p>
                <p>ENET cables bypass OBD2 entirely and connect via Ethernet - use only for D-CAN.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OBDAdapterSettings;
