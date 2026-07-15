import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import type { FlashSession } from '@/lib/obd2Connection';
import { parseFlashFile, fixChecksums, validateChecksums, type ParsedFlashFile, type ChecksumResult } from '@/lib/flashEngine';
import { MSD81_SECTORS } from '@/lib/flashEngine';
import {
  X, Zap, AlertTriangle, CheckCircle,
  ShieldAlert, Play, Square, RotateCcw,
  Save, HardDrive, FileWarning, Upload, FileCheck,
  Cpu, ChevronDown, ChevronUp
} from 'lucide-react';

export const FlashModal: React.FC = () => {
  const { showFlashModal, setShowFlashModal, obd2, profile, addNotification, setFlashSession } = useStore();
  const [step, setStep] = useState<'backup' | 'verify' | 'select' | 'upload' | 'checks' | 'confirm' | 'flashing' | 'complete' | 'error'>('backup');
  const [flashType, setFlashType] = useState<'full' | 'quick' | 'live'>('quick');
  const [session, setSession] = useState<FlashSession | null>(null);
  const [safetyChecks, setSafetyChecks] = useState<{ name: string; pass: boolean; critical: boolean }[]>([]);
  const [dmeInfo, setDmeInfo] = useState<{ vin: string; ecuType: string; software: string } | null>(null);
  const [vinMismatch, setVinMismatch] = useState(false);
  // Tune file upload state
  const [parsedFile, setParsedFile] = useState<ParsedFlashFile | null>(null);
  const [checksumResults, setChecksumResults] = useState<ChecksumResult[] | null>(null);
  const [checksumsFixed, setChecksumsFixed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSectorDetails, setShowSectorDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCriticalPassed = safetyChecks.filter(c => c.critical).every(c => c.pass);

  // File upload handlers
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processTuneFile(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processTuneFile(file);
  }, []);

  const processTuneFile = (file: File) => {
    setUploadError(null);
    setParsedFile(null);
    setChecksumResults(null);

    const validExts = ['.bin', '.ori', '.mod', '.fls', '.hex'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setUploadError(`Invalid file type: ${ext}. Use .bin, .ori, .mod, or .fls`);
      return;
    }

    if (file.size < 0x10000) {
      setUploadError('File too small. Minimum 64KB for a valid flash file.');
      return;
    }
    if (file.size > 0x800000) {
      setUploadError('File too large. Maximum 8MB supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseFlashFile(reader.result as ArrayBuffer);
        setParsedFile(result);
        if (result.isValid) {
          const checks = validateChecksums(result.data, MSD81_SECTORS);
          setChecksumResults(checks);
          setChecksumsFixed(false);
        }
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err?.message || 'Unknown error'}`);
      }
    };
    reader.onerror = () => setUploadError('Failed to read file');
    reader.readAsArrayBuffer(file);
  };

  const handleFixChecksums = () => {
    if (!parsedFile) return;
    const fixed = fixChecksums(parsedFile.data, MSD81_SECTORS);
    setChecksumResults(fixed);
    setChecksumsFixed(true);
  };

  if (!showFlashModal) return null;

  const handleClose = () => {
    setShowFlashModal(false);
    setStep('backup');
    setSession(null);
    setFlashSession(null);
    setSafetyChecks([]);
    setDmeInfo(null);
    setVinMismatch(false);
    setParsedFile(null);
    setChecksumResults(null);
    setChecksumsFixed(false);
    setUploadError(null);
  };

  const handleNext = () => {
    if (step === 'backup') {
      setStep('verify');
    } else if (step === 'verify') {
      setStep('select');
    } else if (step === 'select') {
      setStep('upload');
    } else if (step === 'upload') {
      setStep('checks');
      const passed = runSafetyChecks();
      if (passed) {
        setTimeout(() => setStep('confirm'), 500);
      }
    } else if (step === 'checks') {
      if (allCriticalPassed) setStep('confirm');
    } else if (step === 'confirm') {
      setStep('flashing');
      startFlashing();
    }
  };

  const runSafetyChecks = () => {
    const checks = [
      { name: 'Battery voltage > 13V', pass: obd2.batteryVoltage > 13, critical: true },
      { name: 'Engine OFF', pass: !obd2.engineRunning, critical: true },
      { name: 'Stable connection', pass: obd2.connectionState === 'connected', critical: true },
      { name: 'ECU identified', pass: obd2.ecus.length > 0, critical: true },
      { name: 'DME info read', pass: !!dmeInfo, critical: false },
      { name: 'VIN match', pass: !vinMismatch, critical: false },
    ];
    setSafetyChecks(checks);
    return checks.filter(c => c.critical).every(c => c.pass);
  };

  const startFlashing = () => {
    const flashSession: FlashSession = {
      id: `flash_${Date.now()}`,
      startTime: Date.now(),
      status: 'flashing',
      progress: 0,
      currentSector: 'Calibration 0',
      sectorsTotal: 10,
      sectorsComplete: 0,
      bytesWritten: 0,
      bytesTotal: 2 * 1024 * 1024,
      speed: 0,
      eta: 300,
      errors: [],
      isLiveFlash: flashType === 'live',
      vehicleSpeed: 0,
      batteryVoltage: obd2.batteryVoltage,
    };
    setSession(flashSession);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        flashSession.status = 'complete';
        flashSession.progress = 100;
        flashSession.sectorsComplete = flashSession.sectorsTotal;
        flashSession.bytesWritten = flashSession.bytesTotal;
        flashSession.speed = 65536;
        flashSession.eta = 0;
        setSession({ ...flashSession });
        setStep('complete');
        addNotification({ message: 'Flash completed successfully', type: 'success' });
      } else {
        flashSession.progress = progress;
        flashSession.bytesWritten = Math.floor(progress / 100 * flashSession.bytesTotal);
        flashSession.speed = 32768 + Math.random() * 32768;
        flashSession.eta = Math.floor((100 - progress) / (progress / ((Date.now() - flashSession.startTime) / 1000)));
        flashSession.sectorsComplete = Math.floor(progress / 100 * flashSession.sectorsTotal);
        setSession({ ...flashSession });
      }
    }, 200);
  };

  const currentSector = obd2.ecus.find(e => e.address === '0x12');

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
                {currentSector ? currentSector.name : 'No DME detected'} - {profile.engine}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Step 0: Backup */}
          {step === 'backup' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Flash a new tune to your DME. First, ensure you have a backup:</p>
              <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Backup Status</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">A full backup is required before flashing. This takes ~5 minutes.</p>
                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  I have a backup - Continue
                </button>
              </div>
              <div className="bg-yellow-500/5 rounded-xl p-3 border border-yellow-500/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400">
                  Flashing modifies your ECU firmware. Always backup first. Flash at your own risk.
                </p>
              </div>
            </>
          )}

          {/* Step 1: VIN/ECU Verification */}
          {step === 'verify' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Verify ECU identity:</p>
              <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VIN</span>
                  <span className="text-white font-mono">{dmeInfo?.vin || 'Reading...'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ECU Type</span>
                  <span className="text-white">{dmeInfo?.ecuType || 'Reading...'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Software</span>
                  <span className="text-white font-mono">{dmeInfo?.software || 'Reading...'}</span>
                </div>
                {vinMismatch && (
                  <div className="bg-red-500/10 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2">
                    <FileWarning className="w-3 h-3" />
                    VIN mismatch detected!
                  </div>
                )}
              </div>
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl transition-colors text-sm"
              >
                Verified - Continue
              </button>
            </>
          )}

          {/* Step 2: Select Flash Type */}
          {step === 'select' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Choose flash method:</p>
              <div className="space-y-2">
                {(['quick', 'full', 'live'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFlashType(type)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      flashType === type
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      flashType === type ? 'bg-blue-500/20' : 'bg-gray-800'
                    }`}>
                      <Zap className={`w-4 h-4 ${flashType === type ? 'text-blue-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white capitalize">{type} Flash</div>
                      <div className="text-xs text-gray-500">
                        {type === 'quick' ? '~2 min - Calibration sectors only' :
                         type === 'full' ? '~5 min - Complete flash' :
                         '~8 min - Speed-restricted live tuning'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Upload Tune File */}
          {step === 'upload' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Upload your tune file for validation:</p>

              {!parsedFile && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-[#161b22] hover:border-gray-500'
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Drop tune file here or click to browse</p>
                  <p className="text-xs text-gray-600 mt-1">.bin, .ori, .mod, .fls files supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".bin,.ori,.mod,.fls,.hex"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {uploadError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-300">{uploadError}</span>
                </div>
              )}

              {parsedFile && (
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <FileCheck className="w-5 h-5" />
                      <span className="font-semibold">File Parsed Successfully</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">ECU Type</span>
                        <span className="text-white">{parsedFile.ecuType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">DME Family</span>
                        <span className="text-white">{parsedFile.dmeFamily}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Software</span>
                        <span className="text-white">{parsedFile.softwareVersion || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size</span>
                        <span className="text-white font-mono">{(parsedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      {parsedFile.vin && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500">VIN</span>
                          <span className="text-white font-mono">{parsedFile.vin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {checksumResults && (
                    <div className="border border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowSectorDetails(!showSectorDetails)}
                        className="w-full flex items-center justify-between p-3 bg-[#161b22] hover:bg-[#1c2129] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-white">Sector Checksums</span>
                          {checksumsFixed && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Fixed</span>
                          )}
                        </div>
                        {showSectorDetails ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>

                      {showSectorDetails && (
                        <div className="p-3 space-y-1.5 bg-[#0d1117]">
                          {checksumResults.map((result, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between text-xs p-2 rounded ${
                                result.valid ? 'bg-green-500/5' : 'bg-red-500/5'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {result.valid ? (
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-red-400" />
                                )}
                                <span className="text-gray-300">{result.sector}</span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-500 font-mono">
                                <span>{result.address}</span>
                                <span>{result.computed}</span>
                              </div>
                            </div>
                          ))}

                          {!checksumsFixed && checksumResults.some(r => !r.valid) && (
                            <button
                              onClick={handleFixChecksums}
                              className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs py-2 rounded-lg transition-colors border border-orange-500/20"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Fix Checksums
                            </button>
                          )}

                          {checksumsFixed && (
                            <div className="text-xs text-green-400 text-center py-1">
                              All checksums have been recomputed and fixed
                            </div>
                          )}
                        </div>
                      )}

                      {!showSectorDetails && (
                        <div className="px-3 pb-3 bg-[#0d1117]">
                          <div className="flex items-center gap-2 text-xs">
                            {checksumResults.every(r => r.valid) ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-green-400">All {checksumResults.length} checksums valid</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-yellow-400">
                                  {checksumResults.filter(r => !r.valid).length} of {checksumResults.length} checksums invalid
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => { setParsedFile(null); setChecksumResults(null); setChecksumsFixed(false); setUploadError(null); }}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Choose different file
                  </button>
                </div>
              )}
            </>
          )}

          {/* Step 4: Safety Checks */}
          {step === 'checks' && (
            <>
              <p className="text-sm text-gray-400 mb-3">Pre-flash safety checks:</p>
              <div className="space-y-2">
                {safetyChecks.map((check, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                    check.pass
                      ? 'bg-green-500/5 border-green-500/20'
                      : check.critical
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {check.pass ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : check.critical ? (
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-white'}`}>{check.name}</span>
                    </div>
                    {check.critical && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">CRITICAL</span>
                    )}
                  </div>
                ))}
              </div>
              {!allCriticalPassed && (
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    Critical checks failed. Fix issues before proceeding.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Step 5: Confirm */}
          {step === 'confirm' && (
            <>
              <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Flash Type</span>
                  <span className="text-white capitalize">{flashType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Target ECU</span>
                  <span className="text-white">{currentSector?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="text-white">{profile.year} {profile.engine}</span>
                </div>
              </div>
              <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">
                  Flashing will modify your ECU. Do not disconnect the cable or turn off ignition.
                </p>
              </div>
            </>
          )}

          {/* Step 6: Flashing */}
          {step === 'flashing' && session && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Flashing in progress...</span>
                <span className="text-sm text-orange-400 font-mono">{session.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${session.progress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>Sector: {session.currentSector}</div>
                <div>Sectors: {session.sectorsComplete}/{session.sectorsTotal}</div>
                <div>Speed: {(session.speed / 1024).toFixed(1)} KB/s</div>
                <div>ETA: {session.eta}s</div>
              </div>
              <button
                onClick={() => { obd2Manager.abortFlash(); setStep('error'); }}
                className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2.5 rounded-xl transition-colors text-sm border border-red-500/20"
              >
                <Square className="w-4 h-4" />
                Abort Flash
              </button>
            </div>
          )}

          {/* Step 7: Complete */}
          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Flash Complete!</h3>
                <p className="text-sm text-gray-400 mt-1">Your DME has been successfully updated.</p>
              </div>
              <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white font-mono">{session ? ((Date.now() - session.startTime) / 1000).toFixed(0) : 0}s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sectors Written</span>
                  <span className="text-white">{session?.sectorsComplete}/{session?.sectorsTotal}</span>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl transition-colors text-sm mx-auto"
              >
                <CheckCircle className="w-4 h-4" />
                Done
              </button>
            </div>
          )}

          {/* Step 8: Error */}
          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Flash Failed</h3>
                <p className="text-sm text-gray-400 mt-1">An error occurred during flashing.</p>
              </div>
              <button
                onClick={handleClose}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-xl transition-colors text-sm mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {['backup', 'verify', 'select', 'upload', 'checks', 'confirm'].includes(step) && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 bg-[#0a0a0a]">
            {step === 'backup' && (
              <button onClick={handleClose} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Cancel
              </button>
            )}
            {step === 'verify' && (
              <button onClick={() => setStep('backup')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                Back
              </button>
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
            {step === 'upload' && (
              <>
                <button onClick={() => setStep('select')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!parsedFile || !parsedFile.isValid}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {parsedFile ? 'Continue' : 'Upload Required'}
                  <Play className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {step === 'checks' && (
              <>
                <button onClick={() => setStep('upload')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!allCriticalPassed}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {allCriticalPassed ? 'Flash ECU' : 'Fix Issues'}
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {step === 'confirm' && (
              <>
                <button onClick={() => setStep('upload')} className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Start Flash
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashModal;
