import React, { useState, useCallback } from 'react';
import { obd2Manager } from '@/lib/obd2Connection';

export interface AdapterConfig {
  id: string;
  name: string;
  type: 'usb' | 'bluetooth' | 'wifi';
  protocol: 'k_dcan' | 'enet' | 'obd2';
  chip: string;
  baudRate: number;
  latencyTimer: number;
  dtrRtsMode: boolean;
  autoConnect: boolean;
  requiresPairing: boolean;
  maxBaudRate: number;
  supportsCAN: boolean;
  supportsKLine: boolean;
  description: string;
}

const ADAPTER_PRESETS: AdapterConfig[] = [
  {
    id: 'ftdi_kdcan', name: 'FTDI K+DCAN Cable', type: 'usb',
    protocol: 'k_dcan', chip: 'FTDI FT232R/H', baudRate: 115200,
    latencyTimer: 1, dtrRtsMode: true, autoConnect: true,
    requiresPairing: false, maxBaudRate: 500000, supportsCAN: true, supportsKLine: true,
    description: 'Genuine FTDI-based K+DCAN cable. Best compatibility for BMW INPA/ISTA protocols.',
  },
  {
    id: 'ch340_kdcan', name: 'CH340 K+DCAN Cable', type: 'usb',
    protocol: 'k_dcan', chip: 'CH340/CH341', baudRate: 115200,
    latencyTimer: 16, dtrRtsMode: true, autoConnect: true,
    requiresPairing: false, maxBaudRate: 115200, supportsCAN: true, supportsKLine: true,
    description: 'Budget K+DCAN cable with CH340 chip. May need slower baud for stability.',
  },
  {
    id: 'enet_cable', name: 'BMW ENET Cable', type: 'usb',
    protocol: 'enet', chip: 'AX88772A', baudRate: 100000000,
    latencyTimer: 0, dtrRtsMode: false, autoConnect: true,
    requiresPairing: false, maxBaudRate: 100000000, supportsCAN: true, supportsKLine: false,
    description: 'Ethernet-based F/G-series coding cable. Fastest protocol for newer BMWs.',
  },
  {
    id: 'elm327_bt', name: 'ELM327 Bluetooth', type: 'bluetooth',
    protocol: 'obd2', chip: 'ELM327/PIC18F', baudRate: 38400,
    latencyTimer: 0, dtrRtsMode: false, autoConnect: false,
    requiresPairing: true, maxBaudRate: 500000, supportsCAN: true, supportsKLine: true,
    description: 'Generic ELM327 Bluetooth adapter. Limited to OBD2 PIDs, no flashing.',
  },
  {
    id: 'elm327_wifi', name: 'ELM327 WiFi', type: 'wifi',
    protocol: 'obd2', chip: 'ELM327', baudRate: 115200,
    latencyTimer: 0, dtrRtsMode: false, autoConnect: false,
    requiresPairing: true, maxBaudRate: 500000, supportsCAN: true, supportsKLine: true,
    description: 'WiFi ELM327 adapter. iOS compatible but slower than USB.',
  },
  {
    id: 'vlink_bt', name: 'Veepeak OBDCheck BLE', type: 'bluetooth',
    protocol: 'obd2', chip: 'STN1110/2120', baudRate: 115200,
    latencyTimer: 0, dtrRtsMode: false, autoConnect: false,
    requiresPairing: true, maxBaudRate: 2000000, supportsCAN: true, supportsKLine: false,
    description: 'Advanced BLE adapter with STN chip. Faster than standard ELM327.',
  },
  {
    id: 'oblink_mx', name: 'OBDLink MX+', type: 'bluetooth',
    protocol: 'obd2', chip: 'STN2120', baudRate: 230400,
    latencyTimer: 0, dtrRtsMode: false, autoConnect: false,
    requiresPairing: true, maxBaudRate: 4000000, supportsCAN: true, supportsKLine: true,
    description: 'Professional OBDLink MX+. Supports custom protocols and scripting.',
  },
];

interface OBDAdapterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAdapterId: string | null;
  onSelectAdapter: (id: string) => void;
  adapterConfigs: Record<string, Partial<AdapterConfig>>;
  onUpdateConfig: (id: string, config: Partial<AdapterConfig>) => void;
}

export const OBDAdapterSettings: React.FC<OBDAdapterSettingsProps> = ({
  isOpen, onClose, selectedAdapterId, onSelectAdapter, adapterConfigs, onUpdateConfig
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(selectedAdapterId);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanResults([]);

    try {
      const cable = await obd2Manager.detectCable();
      if (cable) {
        // Map native cable type to our preset IDs
        let detectedId = '';
        if (cable.detectedChip.includes('FTDI')) detectedId = 'ftdi_kdcan';
        else if (cable.detectedChip.includes('CH340')) detectedId = 'ch340_kdcan';
        else if (cable.type === 'enet') detectedId = 'enet_cable';

        if (detectedId) {
          setScanResults([detectedId]);
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedPreset(id);
    onSelectAdapter(id);
  };

  const selectedPresetData = ADAPTER_PRESETS.find(p => p.id === selectedPreset);
  const currentConfig = selectedPreset ? adapterConfigs[selectedPreset] || {} : {};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Cable className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">OBD2 Adapter</h2>
              <p className="text-xs text-gray-500">Select and configure your interface</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-3 rounded-xl transition-colors"
          >
            {scanning ? <Loader className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {scanning ? 'Scanning USB devices...' : 'Scan for Adapters'}
          </button>

          {/* Scan Results */}
          {scanResults.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                Found {scanResults.length} adapter(s)
              </div>
              <div className="space-y-1">
                {scanResults.map(id => {
                  const preset = ADAPTER_PRESETS.find(p => p.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelect(id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        selectedPreset === id ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-[#161b22] hover:bg-[#1c2129]'
                      }`}
                    >
                      <Usb className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">{preset?.name || id}</span>
                      {selectedPreset === id && <CheckCircle className="w-4 h-4 text-blue-400 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {scanResults.length === 0 && !scanning && (
            <div className="text-center py-2 text-gray-500 text-sm">
              No adapters auto-detected. Select manually below.
            </div>
          )}

          {/* Adapter List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400">All Adapters</h3>
            {ADAPTER_PRESETS.map(preset => {
              const isSelected = selectedPreset === preset.id;
              const Icon = preset.type === 'usb' ? Usb : preset.type === 'wifi' ? Wifi : Bluetooth;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelect(preset.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-500/20' : 'bg-gray-800'
                  }`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{preset.name}</span>
                      {preset.protocol === 'k_dcan' && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">K+DCAN</span>
                      )}
                      {preset.protocol === 'enet' && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">ENET</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{preset.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {preset.chip}
                      </span>
                      <span className="flex items-center gap-1">
                        <Signal className="w-3 h-3" />
                        {(preset.baudRate / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Advanced Settings */}
          {selectedPresetData && (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3 bg-[#161b22] hover:bg-[#1c2129] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">Advanced Settings</span>
                </div>
                <RefreshCw className={`w-4 h-4 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-4 bg-[#0d1117]">
                  {/* Baud Rate */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Baud Rate</label>
                    <select
                      value={currentConfig.baudRate || selectedPresetData.baudRate}
                      onChange={e => onUpdateConfig(selectedPreset!, { baudRate: Number(e.target.value) })}
                      className="w-full bg-[#161b22] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 500000, 921600].map(b => (
                        <option key={b} value={b}>{b.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Latency Timer (FTDI only) */}
                  {selectedPresetData.chip.includes('FTDI') && (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Latency Timer (ms)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={255}
                          value={currentConfig.latencyTimer || selectedPresetData.latencyTimer}
                          onChange={e => onUpdateConfig(selectedPreset!, { latencyTimer: Number(e.target.value) })}
                          className="flex-1 accent-blue-500"
                        />
                        <span className="text-sm text-white font-mono w-10 text-right">
                          {currentConfig.latencyTimer || selectedPresetData.latencyTimer}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* DTR/RTS Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">DTR/RTS Bus Switching</div>
                      <div className="text-xs text-gray-500">Toggle between K-Line and D-CAN</div>
                    </div>
                    <button
                      onClick={() => onUpdateConfig(selectedPreset!, { dtrRtsMode: !(currentConfig.dtrRtsMode ?? selectedPresetData.dtrRtsMode) })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        (currentConfig.dtrRtsMode ?? selectedPresetData.dtrRtsMode) ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        (currentConfig.dtrRtsMode ?? selectedPresetData.dtrRtsMode) ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Auto Connect */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">Auto-Connect</div>
                      <div className="text-xs text-gray-500">Connect automatically on app start</div>
                    </div>
                    <button
                      onClick={() => onUpdateConfig(selectedPreset!, { autoConnect: !(currentConfig.autoConnect ?? selectedPresetData.autoConnect) })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        (currentConfig.autoConnect ?? selectedPresetData.autoConnect) ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        (currentConfig.autoConnect ?? selectedPresetData.autoConnect) ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {selectedPresetData.type === 'bluetooth' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-300">
                        Bluetooth adapters have limited functionality. Flashing is not supported.
                        For full functionality, use a USB K+DCAN or ENET cable.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800 bg-[#0a0a0a] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default OBDAdapterSettings;
export { ADAPTER_PRESETS };
