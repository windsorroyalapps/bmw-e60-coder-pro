import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import type { FlashSession } from '@/lib/obd2Connection';
import {
  X, Zap, AlertTriangle, CheckCircle, Loader,
  ShieldAlert, Play, Square,
  Flashlight, FileDown, Activity
} from 'lucide-react';

export const FlashModal: React.FC = () => {
  const { showFlashModal, setShowFlashModal, obd2, currentMap, profile, liveData, setFlashSession } = useStore();
  const [step, setStep] = useState<'select' | 'checks' | 'confirm' | 'flashing' | 'complete' | 'error'>('select');
  const [flashType, setFlashType] = useState<'full' | 'quick' | 'live'>('quick');
  const [session, setSession] = useState<FlashSession | null>(null);
  const [safetyChecks, setSafetyChecks] = useState<{ name: string; pass: boolean; critical: boolean }[]>([]);

  if (!showFlashModal) return null;

  const runSafetyChecks = () => {
    const checks = [
      { name: 'OBD2 Connected', pass: obd2.connectionState === 'connected', critical: true },
      { name: 'DME Online', pass: obd2.ecus.some(e => e.address === '0x12' && e.status === 'online'), critical: true },
      { name: 'Battery >= 13.0V', pass: obd2.batteryVoltage >= 13.0, critical: true },
      { name: 'Ignition ON (KL15)', pass: obd2.ignitionState === 'on', critical: true },
      { name: 'Vehicle Speed < 5 km/h', pass: flashType === 'live' ? liveData.speed < 5 : true, critical: flashType !== 'full' },
      { name: 'Map validated', pass: currentMap !== null, critical: true },
      { name: 'No active faults', pass: obd2.ecus.reduce((a, e) => a + e.faultCodes, 0) === 0, critical: false },
    ];
    setSafetyChecks(checks);
    return checks.every(c => c.pass || !c.critical);
  };

  const handleNext = () => {
    if (step === 'select') {
      setStep('checks');
      const passed = runSafetyChecks();
      if (passed) {
        setTimeout(() => setStep('confirm'), 500);
      }
    } else if (step === 'checks') {
      if (safetyChecks.every(c => c.pass || !c.critical)) {
        setStep('confirm');
      }
    } else if (step === 'confirm') {
      startFlash();
    }
  };

  const startFlash = async () => {
    setStep('flashing');
    const isLive = flashType === 'live';
    const result = await obd2Manager.startFlash(isLive);
    if (result.success && result.session) {
      setSession(result.session);
      setFlashSession(result.session);
      // Start the actual flash execution - progress comes from native events
      obd2Manager.executeFlash();

      // Subscribe to flash state changes to update UI
      const unsub = obd2Manager.subscribeFlash((flashState) => {
        setSession({ ...flashState });
        if (flashState.status === 'complete') {
          setStep('complete');
          unsub();
        } else if (flashState.status === 'error' || flashState.status === 'aborted') {
          setStep('error');
          unsub();
        }
      });
    } else {
      setStep('error');
    }
  };

  const handleAbort = () => {
    obd2Manager.abortFlash();
    setStep('error');
  };

  const handleClose = () => {
    setShowFlashModal(false);
    setStep('select');
    setSession(null);
    setFlashSession(null);
    setSafetyChecks([]);
  };

  const allCriticalPassed = safetyChecks.filter(c => c.critical).every(c => c.pass);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DME Flash</h2>
              <p className="text-xs text-gray-500">
                {currentMap?.name || 'No map'} | {profile.engine.toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Select Flash Type */}
          {step === 'select' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Choose flash method:</p>
              <div className="space-y-2">
                <button
                  onClick={() => setFlashType('quick')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    flashType === 'quick' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flashType === 'quick' ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                    <Flashlight className={`w-5 h-5 ${flashType === 'quick' ? 'text-blue-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">Quick Flash</div>
                    <div className="text-xs text-gray-500">Write calibration data only (~2s)</div>
                  </div>
                  {flashType === 'quick' && <CheckCircle className="w-5 h-5 text-blue-400" />}
                </button>

                <button
                  onClick={() => setFlashType('full')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    flashType === 'full' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flashType === 'full' ? 'bg-orange-500/20' : 'bg-gray-800'}`}>
                    <FileDown className={`w-5 h-5 ${flashType === 'full' ? 'text-orange-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">Full Flash</div>
                    <div className="text-xs text-gray-500">Complete ECU flash (~2min)</div>
                  </div>
                  {flashType === 'full' && <CheckCircle className="w-5 h-5 text-orange-400" />}
                </button>

                <button
                  onClick={() => setFlashType('live')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    flashType === 'live' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flashType === 'live' ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                    <Activity className={`w-5 h-5 ${flashType === 'live' ? 'text-purple-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      Live Flash
                      <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">EXPERIMENTAL</span>
                    </div>
                    <div className="text-xs text-gray-500">Flash while engine running</div>
                  </div>
                  {flashType === 'live' && <CheckCircle className="w-5 h-5 text-purple-400" />}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Safety Checks */}
          {step === 'checks' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Running pre-flash safety checks...</p>
              <div className="space-y-2">
                {safetyChecks.map((check, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      check.pass ? 'border-green-500/30 bg-green-500/5' :
                      check.critical ? 'border-red-500/30 bg-red-500/5' :
                      'border-yellow-500/30 bg-yellow-500/5'
                    }`}
                  >
                    {check.pass ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : check.critical ? (
                      <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${check.pass ? 'text-green-400' : check.critical ? 'text-red-400' : 'text-yellow-400'}`}>
                      {check.name}
                    </span>
                    {check.critical && !check.pass && (
                      <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">BLOCKING</span>
                    )}
                  </div>
                ))}
              </div>
              {!allCriticalPassed && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Fix blocking issues before proceeding
                </div>
              )}
            </>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <h3 className="font-bold text-white">Confirm Flash</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Flash Type</span>
                    <span className="text-white capitalize">{flashType} Flash</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Target Map</span>
                    <span className="text-white">{currentMap?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Engine</span>
                    <span className="text-white">{profile.engine.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Injector</span>
                    <span className="text-white">{profile.injector}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Battery</span>
                    <span className="text-green-400">{obd2.batteryVoltage.toFixed(1)}V</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Est. Time</span>
                    <span className="text-white">{flashType === 'quick' ? '~2s' : flashType === 'live' ? '~3s' : '~2min'}</span>
                  </div>
                </div>
              </div>
              {flashType === 'live' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300">
                  Live flash writes only calibration tables while engine is running.
                  Do not turn off ignition during flash. Keep RPM stable.
                </div>
              )}
              {flashType === 'full' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
                  Full flash requires ignition ON, engine OFF. Do not disconnect cable.
                  Ensure stable 13V+ power supply.
                </div>
              )}
            </>
          )}

          {/* Step 4: Flashing - Real progress from native */}
          {step === 'flashing' && session && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader className="w-6 h-6 text-orange-400 animate-spin" />
                <div>
                  <div className="font-semibold text-white">Flashing in progress...</div>
                  <div className="text-xs text-gray-400">{session.currentSector}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className="h-3 bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${session.progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#161b22] rounded-lg p-2">
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="text-sm font-mono text-white">{session.progress}%</div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-2">
                  <div className="text-xs text-gray-500">Speed</div>
                  <div className="text-sm font-mono text-white">{Math.round(session.speed)} KB/s</div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-2">
                  <div className="text-xs text-gray-500">ETA</div>
                  <div className="text-sm font-mono text-white">{session.eta}s</div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Sectors: {session.sectorsComplete}/{session.sectorsTotal} complete
              </div>

              {/* Abort Button */}
              <button
                onClick={handleAbort}
                className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm py-2.5 rounded-lg transition-colors border border-red-500/20"
              >
                <Square className="w-4 h-4" />
                Abort Flash
              </button>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Flash Complete!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {currentMap?.name} successfully written to DME
                </p>
              </div>
              <div className="bg-[#161b22] rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sectors Written</span>
                  <span className="text-white font-mono">{session?.sectorsTotal}/{session?.sectorsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Bytes</span>
                  <span className="text-white font-mono">{(session?.bytesTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Flash Type</span>
                  <span className="text-white capitalize">{flashType}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Flash Failed</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {session?.status === 'aborted' ? 'Flash was aborted by user' : 'An error occurred during flashing'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800 bg-[#0a0a0a]">
          {step === 'select' && (
            <>
              <button onClick={handleClose} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Next
                <Play className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {step === 'checks' && (
            <>
              <button onClick={() => setStep('select')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!allCriticalPassed}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {allCriticalPassed ? 'Continue' : 'Fix Issues'}
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('checks')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4" />
                Start Flash
              </button>
            </>
          )}
          {(step === 'complete' || step === 'error') && (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashModal;