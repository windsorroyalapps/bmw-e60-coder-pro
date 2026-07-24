import React, { useState, useCallback } from 'react';
import {
  Cpu, Wifi, Bluetooth, Usb, ScanLine, ChevronRight,
  Settings2, AlertTriangle, CheckCircle, Loader,
  X, Signal, Cable
} from 'lucide-react';
import { OBD2Bridge } from '@/lib/nativeBridge';
import type { CableInfo } from '@/lib/nativeBridge';

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
    id: 'cp2102_kdcan', name: 'CP2102 K+DCAN Cable', type: 'usb',
    protocol: 'k_dcan', chip: 'CP2102', baudRate: 115200,
    latencyTimer: 8, dtrRtsMode: true, autoConnect: true,
    requiresPairing: false, maxBaudRate: 500000, supportsCAN: true, supportsKLine: true,
    description: 'CP2102-based K+DCAN cable. Good stability at 500k D-CAN.',
  },
  {
    id: 'pl2303_kdcan', name: 'PL2303 K+DCAN Cable', type: 'usb',
    protocol: 'k_dcan', chip: 'PL2303', baudRate: 115200,
    latencyTimer: 16, dtrRtsMode: true, autoConnect: true,
    requiresPairing: false, maxBaudRate: 115200, supportsCAN: true, supportsKLine: true,
    description: 'Prolific PL2303-based cable. Check for genuine chip (HX vs fake).',
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
  const [scanResults, setScanResults] = useState<CableInfo[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(selectedAdapterId);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanResults([]);
    setScanError(null);

    try {
      const result = await OBD2Bridge.detectCable();
      if (result.found && result.cables && result.cables.length > 0) {
        setScanResults(result.cables);
        const first = result.cables[0];
        const matchedPreset = ADAPTER_PRESETS.find(p => {
          if (first.detectedChip.includes('Ftdi')) return p.id === 'ftdi_kdcan';
          if (first.detectedChip.includes('Ch34')) return p.id === 'ch340_kdcan';
          if (first.detectedChip.includes('Cp21')) return p.id === 'cp2102_kdcan';
          if (first.detectedChip.includes('Prolific')) return p.id === 'pl2303_kdcan';
          return false;
        });
        if (matchedPreset) {
          setSelectedPreset(matchedPreset.id);
          onSelectAdapter(matchedPreset.id);
        }
      } else {
        setScanError(result.error || 'No adapters detected');
      }
    } catch (e: any) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, [onSelectAdapter]);

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
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-3 rounded-xl transition-colors"
          >
            {scanning ? <Loader className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {scanning ? 'Scanning USB devices...' : 'Scan for Adapters'}
          </button>

          {scanResults.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                Found {scanResults.length} adapter(s)
              </div>
              <div className="space-y-2">
                {scanResults.map((cable, idx) => (
                  <div key={idx} className="bg-[#161b22] rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{cable.type}</span>
                      <span className={`px-1.5 py-0.5 rounded ${cable.hasPermission ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {cable.hasPermission ? 'Granted' : 'Needs Permission'}
                      </span>
                    </div>
                    <div className="text-gray-500 grid grid-cols-2 gap-1">
                      <span>Chip: {cable.detectedChip}</span>
                      <span>VID/PID: {cable.vendorId.toString(16).toUpperCase()}/{cable.productId.toString(16).toUpperCase()}</span>
                      <span>Driver: {cable.driverVersion}</span>
                      <span>S/N: {cable.serialNumber || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scanError && !scanning && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {scanError}
            </div>
          )}

          {scanResults.length === 0 && !scanning && !scanError && (
            <div className="text-center py-2 text-gray-500 text-sm">
              No adapters auto-detected. Select manually below.
            </div>
          )}

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
                        {preset.maxBaudRate >= 1000000 ? (preset.maxBaudRate / 1000000).toFixed(0) + 'Mbps' : (preset.maxBaudRate / 1000).toFixed(0) + 'kbps'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {selectedPresetData && (
            <div className="border-t border-gray-800 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                Advanced Settings
                <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 bg-[#161b22] rounded-xl p-4 border border-gray-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Baud Rate</label>
                      <input
                        type="number"
                        value={currentConfig.baudRate || selectedPresetData.baudRate}
                        onChange={(e) => onUpdateConfig(selectedPreset!, { baudRate: parseInt(e.target.value) })}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Latency Timer (ms)</label>
                      <input
                        type="number"
                        value={currentConfig.latencyTimer || selectedPresetData.latencyTimer}
                        onChange={(e) => onUpdateConfig(selectedPreset!, { latencyTimer: parseInt(e.target.value) })}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.autoConnect !== false}
                      onChange={(e) => onUpdateConfig(selectedPreset!, { autoConnect: e.target.checked })}
                      className="rounded border-gray-600 bg-[#0d1117] text-blue-500"
                    />
                    <span className="text-sm text-gray-400">Auto-connect on app launch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.dtrRtsMode || selectedPresetData.dtrRtsMode}
                      onChange={(e) => onUpdateConfig(selectedPreset!, { dtrRtsMode: e.target.checked })}
                      className="rounded border-gray-600 bg-[#0d1117] text-blue-500"
                    />
                    <span className="text-sm text-gray-400">DTR/RTS mode switching (K+DCAN)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OBDAdapterSettings;
