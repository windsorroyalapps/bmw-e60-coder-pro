import React, { useState, useEffect } from 'react';
import { gamepadManager, GamepadMapping, DEFAULT_MAPPINGS } from '@/lib/gamepadManager';
import { X, Check } from 'lucide-react';

interface GamepadMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GamepadMappingModal: React.FC<GamepadMappingModalProps> = ({ isOpen, onClose }) => {
  const [gpState, setGpState] = useState(() => gamepadManager.getState());
  const [recordingKey, setRecordingKey] = useState<{ type: 'button' | 'axis', key: string } | null>(null);
  const [tempMapping, setTempMapping] = useState<GamepadMapping | null>(null);

  useEffect(() => {
    const unsub = gamepadManager.subscribe(setGpState);
    return () => { unsub(); };
  }, []);

  if (!isOpen) return null;

  const startRecording = (type: 'button' | 'axis', key: string) => {
    setRecordingKey({ type, key });
  };

  // Poll for input during recording
  useEffect(() => {
    if (!recordingKey) return;

    const interval = setInterval(() => {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (!pad) continue;

        if (recordingKey.type === 'button') {
          for (let i = 0; i < pad.buttons.length; i++) {
            if (pad.buttons[i].pressed) {
              updateMapping('button', recordingKey.key, i);
              setRecordingKey(null);
              clearInterval(interval);
              return;
            }
          }
        } else {
          for (let i = 0; i < pad.axes.length; i++) {
            if (Math.abs(pad.axes[i]) > 0.7) {
              updateMapping('axis', recordingKey.key, i);
              setRecordingKey(null);
              clearInterval(interval);
              return;
            }
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [recordingKey]);

  const updateMapping = (type: 'button' | 'axis', key: string, value: number) => {
    console.log(`Mapping ${key} to ${type} index ${value}`);
    const base = tempMapping || (gpState.customMappingEnabled ? gamepadManager.getCustomMapping() : gamepadManager.getDefaultMapping());
    if (!base) return;
    const newMap = JSON.parse(JSON.stringify(base));
    if (type === 'button') newMap.buttons[key] = value;
    else newMap.axes[key] = value;
    setTempMapping(newMap);
  };

  const handleSave = () => {
    if (tempMapping) {
      gamepadManager.setCustomMapping(tempMapping);
    }
    onClose();
  };

  const buttons = gpState?.buttons || {};
  const axes = gpState?.axes || {};
  const connected = gpState?.connected || false;
  const controllerName = gpState?.controllerName || 'Disconnected';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0d1117] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Custom Key Bindings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400">
            Click a function below, then press the button or move the stick on your controller to bind it.
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Buttons</h3>
              <div className="space-y-2">
                {Object.keys(buttons).map((btn) => (
                  <button
                    key={btn}
                    onClick={() => startRecording('button', btn)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      recordingKey?.key === btn ? 'border-blue-500 bg-blue-500/10 animate-pulse' : 'border-gray-800 bg-[#161b22] hover:border-gray-700'
                    }`}
                  >
                    <span className="text-sm text-gray-300 capitalize">{btn.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-xs font-mono text-blue-400">
                      {recordingKey?.key === btn ? 'Press Button...' : 'Click to bind'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Axes</h3>
              <div className="space-y-2">
                {Object.keys(axes).map((axis) => (
                  <button
                    key={axis}
                    onClick={() => startRecording('axis', axis)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      recordingKey?.key === axis ? 'border-blue-500 bg-blue-500/10 animate-pulse' : 'border-gray-800 bg-[#161b22] hover:border-gray-700'
                    }`}
                  >
                    <span className="text-sm text-gray-300 capitalize">{axis.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-xs font-mono text-blue-400">
                      {recordingKey?.key === axis ? 'Move Stick...' : 'Click to bind'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">{controllerName}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Save Mappings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamepadMappingModal;
