import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { gamepadManager } from '@/lib/gamepadManager';
import { VO_OPTIONS, CATEGORIES, validateVOCombination } from '@/lib/voEditor';
import type { GamepadState, GamepadAxes } from '@/lib/gamepadManager';
import { GamepadMappingModal } from '@/components/GamepadMappingModal';
import { CodingService } from '@/lib/codingService';
import {
  Gamepad2, AlertTriangle, CheckCircle, Shield, ShieldAlert,
  Settings, Zap, Navigation, Car,
  Info, Lock, Unlock, Siren,
  X, RotateCcw, Cog, Lightbulb, Monitor, Armchair,
  Check, Bluetooth, Usb, Sliders, Save, Loader2
} from 'lucide-react';

const CAT_ICONS: Record<string, React.ElementType> = {
  steering: Navigation, engine: Zap, transmission: Cog,
  safety: Shield, comfort: Armchair, lighting: Lightbulb,
  electronic: Monitor, body: Car,
};

// Steering wheel visual component
const SteeringWheel: React.FC<{ angle: number; size?: number }> = ({ angle, size = 140 }) => {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 140 140">
        {/* Outer rim */}
        <circle cx="70" cy="70" r="65" fill="none" stroke="#333" strokeWidth="8" />
        <circle cx="70" cy="70" r="65" fill="none" stroke="#222" strokeWidth="6" />
        {/* Spokes */}
        <g transform={`rotate(${angle}, 70, 70)`}>
          <rect x="64" y="15" width="12" height="40" rx="3" fill="#444" />
          <rect x="64" y="85" width="12" height="40" rx="3" fill="#444" />
          <rect x="15" y="64" width="40" height="12" rx="3" fill="#444" />
          <rect x="85" y="64" width="40" height="12" rx="3" fill="#444" />
          {/* Center */}
          <circle cx="70" cy="70" r="22" fill="#1a1a2e" stroke="#555" strokeWidth="2" />
          <circle cx="70" cy="70" r="16" fill="#0d1117" />
          {/* BMW logo hint */}
          <circle cx="70" cy="70" r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.5" />
          {/* Top marker */}
          <rect x="68" y="8" width="4" height="8" rx="1" fill="#3b82f6" />
        </g>
        {/* Rotation indicator */}
        <text x="70" y="135" textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">
          {Math.abs(angle).toFixed(0)}° {angle > 1 ? 'R' : angle < -1 ? 'L' : 'C'}
        </text>
      </svg>
    </div>
  );
};

// Trigger bar
const TriggerBar: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-12">{label}</span>
    <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-100"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-xs text-gray-400 w-10 text-right font-mono">{Math.round(value)}%</span>
  </div>
);

// Axis visualizer
const AxisVisualizer: React.FC<{ axes: GamepadAxes; deadzone: number }> = ({ axes, deadzone }) => (
  <div className="relative w-28 h-28 bg-[#0a0a0a] rounded-lg border border-gray-800">
    {/* Crosshair */}
    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800" />
    <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-800" />
    {/* Deadzone circle */}
    <div
      className="absolute rounded-full border border-gray-700/50"
      style={{ width: `${deadzone * 100}%`, height: `${deadzone * 100}%`, left: `${50 - deadzone * 50}%`, top: `${50 - deadzone * 50}%` }}
    />
    {/* Stick position */}
    <div
      className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-75"
      style={{ left: `${50 + axes.leftStickX * 50 - 6}%`, top: `${50 + axes.leftStickY * 50 - 6}%` }}
    />
    <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-gray-600">L Stick</div>
  </div>
);

export const GamepadPage: React.FC = () => {
  const { obd2 } = useStore();
  const [gpState, setGpState] = useState<GamepadState>(gamepadManager.getState());
  const [activeTab, setActiveTab] = useState<'drive' | 'vo'>('drive');
  const [safetyDialog, setSafetyDialog] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [safetyChecks, setSafetyChecks] = useState({ handbrake: false, offroad: false, emergency: false, understand: false });
  const [voEnabled, setVoEnabled] = useState<string[]>(['1CA', '205', '4A4']);
  const [voWarnings, setVoWarnings] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('steering');
  const [showHelp, setShowHelp] = useState(false);
  const [isCoding, setIsCoding] = useState(false);
  const [codingResult, setCodingResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    gamepadManager.startScanning();
    const unsub = gamepadManager.subscribe(setGpState);
    return () => { unsub(); gamepadManager.stopScanning(); };
  }, []);

  useEffect(() => {
    setVoWarnings(validateVOCombination(voEnabled));
  }, [voEnabled]);

  const toggleVO = useCallback((code: string) => {
    setVoEnabled(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }, []);

  const handleApplyVO = async () => {
    setIsCoding(true);
    setCodingResult(null);
    try {
      const profile: VOProfile = {
        options: voEnabled,
        baseFA: '0307',
        vin: 'NV71',
        date: '0307'
      };

      const res = await CodingService.writeVehicleOrder(profile);
      if (res.success) {
        // If F10W is selected, also apply the module patch
        if (voEnabled.includes('F10W')) {
          const patchRes = await CodingService.applyF10WheelPatch();
          setCodingResult(patchRes);
        } else {
          setCodingResult(res);
        }
      } else {
        setCodingResult(res);
      }
    } catch (e) {
      setCodingResult({ success: false, message: (e as Error).message });
    } finally {
      setIsCoding(false);
    }
  };

  const allSafetyChecked = safetyChecks.handbrake && safetyChecks.offroad && safetyChecks.emergency && safetyChecks.understand;

  const handleEnable = () => {
    if (!gpState.safetyConfirmed) { setSafetyDialog(true); return; }
    gamepadManager.enable();
  };

  const handleConfirmSafety = () => {
    gamepadManager.confirmSafety();
    setSafetyDialog(false);
    gamepadManager.enable();
  };

  const canDrive = obd2.connectionState === 'connected';

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Tabs */}
      <div className="flex bg-[#0d1117] border-b border-gray-800">
        <button onClick={() => setActiveTab('drive')} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'drive' ? 'text-green-400 border-green-400 bg-green-400/5' : 'text-gray-400 border-transparent hover:text-white'}`}>
          <Gamepad2 className="w-4 h-4" /> Controller Drive
        </button>
        <button onClick={() => setActiveTab('vo')} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vo' ? 'text-blue-400 border-blue-400 bg-blue-400/5' : 'text-gray-400 border-transparent hover:text-white'}`}>
          <Settings className="w-4 h-4" /> VO Editor
        </button>
      </div>

      {/* DRIVE TAB */}
      {activeTab === 'drive' && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              gpState.enabled ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              gpState.connected ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
              'bg-gray-800/50 border-gray-700 text-gray-500'
            }`}>
              <Gamepad2 className="w-3.5 h-3.5" />
              {gpState.enabled ? 'DRIVE ACTIVE' : gpState.connected ? 'Controller Ready' : 'No Controller'}
            </div>
            {gpState.enabled && (
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-medium animate-pulse">
                <Siren className="w-3.5 h-3.5" />
                ENGINE CONTROL ACTIVE
              </div>
            )}
            {!canDrive && (
              <div className="flex items-center gap-1.5 bg-gray-800 text-gray-500 px-3 py-1.5 rounded-lg text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Connect OBD2 to drive
              </div>
            )}
            <button onClick={() => setShowHelp(!showHelp)} className="ml-auto text-gray-500 hover:text-white text-xs flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Controls
            </button>
          </div>

          {/* Help overlay */}
          {showHelp && (
            <div className="bg-[#161b22] rounded-xl p-4 border border-gray-700 text-xs space-y-2">
              <div className="flex items-center justify-between"><span className="font-semibold text-white">Controller Mapping</span><button onClick={() => setShowHelp(false)}><X className="w-4 h-4 text-gray-500" /></button></div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400">
                <span>Left Stick</span><span className="text-blue-400">Steering</span>
                <span>RT (Right Trigger)</span><span className="text-green-400">Throttle</span>
                <span>LT (Left Trigger)</span><span className="text-red-400">Brake</span>
                <span>Start</span><span className="text-green-400">Enable Drive</span>
                <span>Back</span><span className="text-red-400">Disable Drive</span>
                <span>Xbox Button</span><span className="text-red-400 font-bold">EMERGENCY STOP</span>
                <span>X</span><span className="text-yellow-400">Toggle Headlights</span>
                <span>Y</span><span className="text-yellow-400">Horn</span>
                <span>LB / RB</span><span className="text-blue-400">Blinkers L/R</span>
                <span>D-Pad Up/Down</span><span className="text-purple-400">Sport / Eco Mode</span>
              </div>
            </div>
          )}

          {/* Main Control Area */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left: Controls */}
            <div className="space-y-3">
              {/* Connection */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500">Controller Status</div>
                  {gpState.connected && (
                    <div className="flex items-center gap-1">
                      {gpState.controllerName.toLowerCase().includes('wireless') || gpState.controllerName.toLowerCase().includes('bluetooth') ? (
                        <Bluetooth className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Usb className="w-3 h-3 text-gray-400" />
                      )}
                      <span className="text-[10px] text-gray-500 uppercase">{gpState.controllerType}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${gpState.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`text-sm font-medium ${gpState.connected ? 'text-green-400' : 'text-red-400'}`}>
                    {gpState.connected ? gpState.controllerName : 'No Controller Found'}
                  </span>
                </div>

                <button
                  onClick={() => setMappingModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors border border-gray-700"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Custom Key Bindings
                </button>
              </div>

              {/* Drive Controls */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800 space-y-2">
                <div className="text-xs text-gray-500">Drive Control</div>
                {!gpState.safetyConfirmed ? (
                  <button
                    onClick={() => setSafetyDialog(true)}
                    disabled={!gpState.connected || !canDrive}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm py-3 rounded-lg transition-colors font-semibold"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Complete Safety Check
                  </button>
                ) : !gpState.enabled ? (
                  <button
                    onClick={handleEnable}
                    disabled={!gpState.connected || !canDrive}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm py-3 rounded-lg transition-colors font-semibold"
                  >
                    <Unlock className="w-4 h-4" />
                    Enable Drive Mode
                  </button>
                ) : (
                  <button
                    onClick={() => gamepadManager.disable()}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm py-3 rounded-lg transition-colors font-semibold"
                  >
                    <Lock className="w-4 h-4" />
                    Disable Drive Mode
                  </button>
                )}

                <button
                  onClick={() => gamepadManager.emergencyStop()}
                  disabled={!gpState.enabled}
                  className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 disabled:bg-gray-900 disabled:text-gray-700 text-red-400 text-xs py-2 rounded-lg transition-colors border border-red-500/20"
                >
                  <Siren className="w-3.5 h-3.5" />
                  EMERGENCY STOP
                </button>
              </div>

              {/* Drive Mode */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Drive Mode</div>
                <div className="grid grid-cols-4 gap-1">
                  {(['eco', 'comfort', 'sport', 'track'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => gamepadManager.setDriveMode(m)}
                      className={`px-2 py-1.5 rounded text-xs capitalize transition-colors ${
                        gpState.driveMode === m
                          ? m === 'eco' ? 'bg-green-600 text-white' : m === 'sport' ? 'bg-orange-600 text-white' : m === 'track' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-600 mt-1">
                  {gpState.driveMode === 'eco' && 'Reduced throttle response, soft steering'}
                  {gpState.driveMode === 'comfort' && 'Balanced response for daily driving'}
                  {gpState.driveMode === 'sport' && 'Aggressive throttle, heavier steering'}
                  {gpState.driveMode === 'track' && 'Maximum response, full brake curve'}
                </div>
              </div>
            </div>

            {/* Center: Steering Wheel Visual */}
            <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-500 mb-3">Steering Input</div>
              <SteeringWheel angle={gpState.enabled ? -gpState.axes.leftStickX * 180 : 0} size={160} />
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {-gpState.axes.leftStickX.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded ${gpState.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                  {gpState.enabled ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Right: Input Meters */}
            <div className="space-y-3">
              {/* Axis Visualizer */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Stick Input</div>
                <AxisVisualizer axes={gpState.axes} deadzone={gpState.deadzone} />
              </div>

              {/* Trigger Bars */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800 space-y-2">
                <div className="text-xs text-gray-500">Controls</div>
                <TriggerBar value={gpState.axes.rightTrigger * 100} label="Throttle" color="#22c55e" />
                <TriggerBar value={gpState.axes.leftTrigger * 100} label="Brake" color="#ef4444" />
                <TriggerBar value={Math.abs(gpState.axes.leftStickX) * 100} label="Steering" color="#3b82f6" />
              </div>

              {/* Sensitivity Settings */}
              <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800 space-y-2">
                <div className="text-xs text-gray-500">Sensitivity</div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500"><span>Steering</span><span className="font-mono">{gpState.steeringSensitivity.toFixed(1)}x</span></div>
                  <input type="range" min={0.3} max={2.0} step={0.1} value={gpState.steeringSensitivity} onChange={e => gamepadManager.setSteeringSensitivity(Number(e.target.value))} className="w-full accent-blue-500 h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500"><span>Throttle</span><span className="font-mono">{gpState.throttleSensitivity.toFixed(1)}x</span></div>
                  <input type="range" min={0.3} max={2.0} step={0.1} value={gpState.throttleSensitivity} onChange={e => gamepadManager.setThrottleSensitivity(Number(e.target.value))} className="w-full accent-green-500 h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500"><span>Brake</span><span className="font-mono">{gpState.brakeSensitivity.toFixed(1)}x</span></div>
                  <input type="range" min={0.3} max={2.0} step={0.1} value={gpState.brakeSensitivity} onChange={e => gamepadManager.setBrakeSensitivity(Number(e.target.value))} className="w-full accent-red-500 h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500"><span>Deadzone</span><span className="font-mono">{Math.round(gpState.deadzone * 100)}%</span></div>
                  <input type="range" min={0.05} max={0.3} step={0.01} value={gpState.deadzone} onChange={e => gamepadManager.setDeadzone(Number(e.target.value))} className="w-full accent-gray-500 h-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Safety Warning */}
          {!gpState.safetyConfirmed && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-yellow-400">Safety Check Required</div>
                  <div className="text-xs text-yellow-300 mt-1">
                    Before enabling controller drive mode, you must complete the safety checklist. 
                    Controller driving is for OFF-ROAD / CLOSED COURSE use only.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VO EDITOR TAB */}
      {activeTab === 'vo' && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Vehicle Order Editor</h2>
              <p className="text-xs text-gray-500">Enable/disable factory options via VO coding</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyVO}
                disabled={isCoding || !canDrive}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isCoding ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                }`}
              >
                {isCoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isCoding ? 'Coding...' : 'Apply to Car'}
              </button>
              <button onClick={() => setVoEnabled(['1CA', '205', '4A4'])} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* Coding Result Toast */}
          {codingResult && (
            <div className={`p-3 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
              codingResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2 text-sm">
                {codingResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {codingResult.message}
              </div>
              <button onClick={() => setCodingResult(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
            </div>
          )}

          {/* Warnings */}
          {voWarnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 space-y-1">
              {voWarnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-yellow-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => {
              const Icon = CAT_ICONS[cat.id] || Cog;
              const count = VO_OPTIONS.filter(o => o.category === cat.id && voEnabled.includes(o.code)).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.name}
                  {count > 0 && <span className="bg-white/20 px-1 rounded text-[10px]">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Options List */}
          <div className="space-y-2">
            {VO_OPTIONS.filter(o => o.category === activeCategory).map(option => {
              const isEnabled = voEnabled.includes(option.code);
              return (
                <button
                  key={option.code}
                  onClick={() => toggleVO(option.code)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isEnabled
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-gray-800 bg-[#0d1117] hover:border-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isEnabled ? 'bg-green-500 border-green-500' : 'border-gray-600'
                  }`}>
                    {isEnabled && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">{option.code}</span>
                      <span className="font-semibold text-white text-sm">{option.name}</span>
                      {option.requiresHardware && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">HW</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    {option.warning && isEnabled && (
                      <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {option.warning}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* AFS Special Info */}
          {activeCategory === 'steering' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h3 className="font-semibold text-blue-400 flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4" /> AFS Setup Guide
              </h3>
              <div className="text-xs text-blue-300 space-y-1">
                <p>To enable Active Front Steering (AFS):</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Select <strong>2VB - Active Front Steering</strong> above</li>
                  <li>Flash VO changes to CAS and NFRM modules</li>
                  <li>Install AFS actuator hardware (rack-mounted servo motor)</li>
                  <li>Install AFS control module (under dashboard)</li>
                  <li>Code SZL for AFS communication</li>
                  <li>Calibrate steering angle sensor (0° straight ahead)</li>
                </ol>
                <p className="mt-2 text-yellow-400">AFS changes steering ratio from 10:1 (parking) to 18:1 (highway) automatically.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SAFETY DIALOG */}
      {safetyDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-red-500/30 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-500/10 px-5 py-4 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400" />
                <h2 className="text-lg font-bold text-white">Safety Checklist</h2>
              </div>
              <p className="text-xs text-red-300 mt-1">
                Controller drive mode is for OFF-ROAD / CLOSED COURSE use only.
                Confirm all safety items before proceeding.
              </p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => setSafetyChecks(p => ({ ...p, handbrake: !p.handbrake }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${safetyChecks.handbrake ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'}`}
              >
                {safetyChecks.handbrake ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <div className="w-5 h-5 rounded border border-gray-600 flex-shrink-0" />}
                <span className="text-sm text-white">Vehicle is on a closed course or private property</span>
              </button>
              <button
                onClick={() => setSafetyChecks(p => ({ ...p, offroad: !p.offroad }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${safetyChecks.offroad ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'}`}
              >
                {safetyChecks.offroad ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <div className="w-5 h-5 rounded border border-gray-600 flex-shrink-0" />}
                <span className="text-sm text-white">No traffic, pedestrians, or obstacles nearby</span>
              </button>
              <button
                onClick={() => setSafetyChecks(p => ({ ...p, emergency: !p.emergency }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${safetyChecks.emergency ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'}`}
              >
                {safetyChecks.emergency ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <div className="w-5 h-5 rounded border border-gray-600 flex-shrink-0" />}
                <span className="text-sm text-white">I know the Xbox/PS button is EMERGENCY STOP</span>
              </button>
              <button
                onClick={() => setSafetyChecks(p => ({ ...p, understand: !p.understand }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${safetyChecks.understand ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'}`}
              >
                {safetyChecks.understand ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <div className="w-5 h-5 rounded border border-gray-600 flex-shrink-0" />}
                <span className="text-sm text-white">I understand this is experimental and use at my own risk</span>
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800 bg-[#0a0a0a]">
              <button onClick={() => setSafetyDialog(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button
                onClick={handleConfirmSafety}
                disabled={!allSafetyChecked}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {allSafetyChecked ? 'Confirm & Enable' : 'Check All Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      <GamepadMappingModal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
      />
    </div>
  );
};

export default GamepadPage;
