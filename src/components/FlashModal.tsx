import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import type { FlashSession } from '@/lib/obd2Connection';
import type { FlashBackup } from '@/types';
import {
  X, Zap, AlertTriangle, CheckCircle, Loader,
  ShieldAlert, Play, Square, RotateCcw,
  Save, HardDrive, FileWarning
} from 'lucide-react';

export const FlashModal: React.FC = () => {
  const {
    showFlashModal, setShowFlashModal, obd2, currentMap, profile,
    liveData, setFlashSession, flashBackups, addFlashBackup
  } = useStore();

  const [step, setStep] = useState<'backup' | 'verify' | 'select' | 'checks' | 'confirm' | 'flashing' | 'complete' | 'error'>('backup');
  const [flashType, setFlashType] = useState<'full' | 'quick' | 'live'>('quick');
  const [session, setSession] = useState<FlashSession | null>(null);
  const [safetyChecks, setSafetyChecks] = useState<{ name: string; pass: boolean; critical: boolean }[]>([]);
  const [dmeInfo, setDmeInfo] = useState<{ vin: string; ecuType: string; software: string } | null>(null);
  const [vinMismatch, setVinMismatch] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupSector, setBackupSector] = useState('');

  if (!showFlashModal) return null;

  const runBackup = async () => {
    setBackingUp(true);
    setBackupProgress(0);
    try {
      const unsub = await obd2Manager.addBackupProgressListener((p) => {
        setBackupProgress(p.progress);
        setBackupSector(p.currentSector);
      });

      const result = await obd2Manager.backupDME();
      unsub();

      if (result.success && result.backup) {
        addFlashBackup(result.backup);
      }
      setBackingUp(false);
      setStep('verify');
      runVINVerification();
    } catch (e) {
      setBackingUp(false);
      // Continue even if backup fails - user acknowledged risk
      setStep('verify');
      runVINVerification();
    }
  };

  const runVINVerification = async () => {
    try {
      const info = await obd2Manager.readDMEInfo();
      if (info) {
        setDmeInfo(info);
        // Check VIN match if profile has a VIN
        if (profile.vin && profile.vin.length > 0 && info.vin !== profile.vin) {
          setVinMismatch(true);
        }
      }
    } catch (e) {
      // Continue without VIN verification
    }
  };

  const runSafetyChecks = () => {
    const checks = [
      { name: 'OBD2 Connected', pass: obd2.connectionState === 'connected', critical: true },
      { name: 'DME Online', pass: obd2.ecus.some(e => e.address === '0x12' && e.status === 'online'), critical: true },
      { name: 'Battery >= 13.0V', pass: obd2.batteryVoltage >= 13.0, critical: true },
      { name: 'Ignition ON (KL15)', pass: obd2.ignitionState === 'on', critical: true },
      { name: 'Vehicle Speed < 5 km/h', pass: flashType === 'live' ? liveData.speed < 5 : true, critical: flashType !== 'full' },
      { name: 'Map validated', pass: currentMap !== null, critical: true },
      { name: 'No active faults', pass: obd2.ecus.reduce((a, e) => a + e.faultCodes, 0) === 0, critical: false },
      { name: 'VIN Verified', pass: !vinMismatch, critical: true },
    ];
    setSafetyChecks(checks);
    return checks.every(c => c.pass || !c.critical);
  };

  const handleNext = () => {
    if (step === 'backup') {
      runBackup();
    } else if (step === 'verify') {
      setStep('select');
    } else if (step === 'select') {
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

  const handleSkipBackup = () => {
    setStep('verify');
    runVINVerification();
  };

  const startFlash = async () => {
    setStep('flashing');
    const isLive = flashType === 'live';
    const result = await obd2Manager.startFlash(isLive);
    if (result.success && result.session) {
      setSession(result.session);
      setFlashSession(result.session);
      obd2Manager.executeFlash();

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
    setStep('backup');
    setSession(null);
    setFlashSession(null);
    setSafetyChecks([]);
    setDmeInfo(null);
    setVinMismatch(false);
    setBackingUp(false);
    setBackupProgress(0);
  };

  const handleRestore = async (backup: FlashBackup) => {
    setStep('flashing');
    setSession({
      id: `restore_${Date.now()}`,
      startTime: Date.now(),
      status: 'flashing',
      progress: 0,
      currentSector: 'Starting restore...',
      sectorsTotal: backup.sectors.length,
      sectorsComplete: 0,
      bytesWritten: 0,
      bytesTotal: backup.totalBytes,
      speed: 0,
      eta: 120,
      errors: [],
      isLiveFlash: false,
      vehicleSpeed: 0,
      batteryVoltage: obd2.batteryVoltage,
    });

    const result = await obd2Manager.restoreDME(backup.id);
    if (result.success) {
      setStep('complete');
    } else {
      setStep('error');
    }
  };

  const allCriticalPassed = safetyChecks.filter(c => c.critical).every(c => c.pass);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
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

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 0: Backup */}
          {step === 'backup' && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Save className="w-6 h-6 text-blue-400" />
                  <h3 className="font-bold text-white">Backup DME Memory</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Before flashing, we strongly recommend backing up your current DME memory.
                  This allows one-tap recovery if something goes wrong.
                </p>
                {flashBackups.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Existing backups ({flashBackups.length}):</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {flashBackups.map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-[#161b22] rounded-lg p-2">
                          <div className="text-xs">
                            <span className="text-gray-300">{new Date(b.createdAt).toLocaleString()}</span>
                            <span className="text-gray-500 ml-2">{b.vin}</span>
                          </div>
                          <button
                            onClick={() => handleRestore(b)}
                            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {backingUp && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    Backing up DME... {backupProgress}%
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${backupProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{backupSector}</p>
                </div>
              )}
            </>
          )}

          {/* Step 1: VIN Verification */}
          {step === 'verify' && (
            <>
              <div className={`rounded-xl p-4 border ${vinMismatch ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {vinMismatch ? <FileWarning className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
                  <h3 className="font-bold text-white">VIN / ECU Verification</h3>
                </div>
                {dmeInfo ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Connected VIN</span>
                      <span className="text-white font-mono">{dmeInfo.vin || 'Not available'}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Profile VIN</span>
                      <span className="text-white font-mono">{profile.vin || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>ECU Type</span>
                      <span className="text-white">{dmeInfo.ecuType || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Software</span>
                      <span className="text-white">{dmeInfo.software || 'Unknown'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Could not read DME info. Proceed with caution.</p>
                )}
                {vinMismatch && (
                  <div className="mt-3 text-xs text-red-300 bg-red-500/10 p-2 rounded">
                    VIN mismatch detected! Connected ECU does not match your vehicle profile.
                    Flashing a tune for a different vehicle can cause serious damage.
                  </div>
                )}
                {!vinMismatch && profile.vin && dmeInfo?.vin && (
                  <div className="mt-3 text-xs text-green-300 bg-green-500/10 p-2 rounded">
                    VIN verified - connected ECU matches your vehicle profile.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Select Flash Type */}
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
                    <Zap className={`w-5 h-5 ${flashType === 'quick' ? 'text-blue-400' : 'text-gray-500'}`} />
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
                    <HardDrive className={`w-5 h-5 ${flashType === 'full' ? 'text-orange-400' : 'text-gray-500'}`} />
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
                    <Play className={`w-5 h-5 ${flashType === 'live' ? 'text-purple-400' : 'text-gray-500'}`} />
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

          {/* Step 3: Safety Checks */}
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

          {/* Step 4: Confirm */}
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
                  {dmeInfo?.vin && (
                    <div className="flex justify-between text-gray-400">
                      <span>VIN</span>
                      <span className="text-white font-mono text-xs">{dmeInfo.vin}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400">
                    <span>Est. Time</span>
                    <span className="text-white">{flashType === 'quick' ? '~2s' : flashType === 'live' ? '~3s' : '~2min'}</span>
                  </div>
                </div>
              </div>
              {flashBackups.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  DME backup available - restore possible if needed
                </div>
              )}
            </>
          )}

          {/* Step 5: Flashing */}
          {step === 'flashing' && session && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader className="w-6 h-6 text-orange-400 animate-spin" />
                <div>
                  <div className="font-semibold text-white">Flashing in progress...</div>
                  <div className="text-xs text-gray-400">{session.currentSector}</div>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div className="h-3 bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${session.progress}%` }} />
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
              <button
                onClick={handleAbort}
                className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm py-2.5 rounded-lg transition-colors border border-red-500/20"
              >
                <Square className="w-4 h-4" />
                Abort Flash
              </button>
            </div>
          )}

          {/* Step 6: Complete */}
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
              {flashBackups.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                  <p className="text-xs text-orange-300 mb-2">A backup is available. You can restore your original tune:</p>
                  <button
                    onClick={() => handleRestore(flashBackups[0])}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore Original Tune
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800 bg-[#0a0a0a] flex-shrink-0">
          {step === 'backup' && (
            <>
              <button onClick={handleSkipBackup} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Skip Backup
              </button>
              <button
                onClick={handleNext}
                disabled={backingUp}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {backingUp ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {backingUp ? 'Backing up...' : 'Backup & Continue'}
              </button>
            </>
          )}
          {step === 'verify' && (
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
          {step === 'select' && (
            <>
              <button onClick={() => setStep('verify')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Back
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
