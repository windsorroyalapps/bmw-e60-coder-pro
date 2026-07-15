// BMW E60 Coder Pro - Global State Store
// 100% LIVE - All data comes from real OBD2 via native Android bridge.
// No simulation. No mock data. No Math.random().

import { create } from 'zustand';
import type {
  MapType, LiveData, LogSession,
  PerformanceMap, VehicleProfile, AiTuneRecommendation, ConnectionStatus,
  GaugeLayout, FlashBackup, DTCReading, AdapterConfig
} from '@/types';
import type { OBD2State, FlashSession, CableInfo } from '@/lib/obd2Connection';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { geminiAiService, type AiChatMessage } from '@/lib/geminiAiService';

interface AppState {
  connection: ConnectionStatus;
  setConnection: (c: Partial<ConnectionStatus>) => void;
  obd2: OBD2State;
  setObd2: (o: Partial<OBD2State>) => void;
  obd2Cable: CableInfo | null;
  setObd2Cable: (c: CableInfo | null) => void;
  flashSession: FlashSession | null;
  setFlashSession: (f: FlashSession | null) => void;
  flashBackups: FlashBackup[];
  addFlashBackup: (b: FlashBackup) => void;
  removeFlashBackup: (id: string) => void;
  dtcReadings: DTCReading[];
  setDtcReadings: (r: DTCReading[]) => void;
  profile: VehicleProfile;
  updateProfile: (p: Partial<VehicleProfile>) => void;
  currentMap: PerformanceMap | null;
  setCurrentMap: (m: PerformanceMap) => void;
  generateMap: (mapType: MapType) => void;
  liveData: LiveData;
  updateLiveData: (d: Partial<LiveData>) => void;
  isLogging: boolean;
  setIsLogging: (v: boolean) => void;
  obd2ConnectionPaused: boolean;
  setObd2ConnectionPaused: (v: boolean) => void;
  watchdogEnabled: boolean;
  setWatchdogEnabled: (v: boolean) => void;
  lastHeartbeat: number;
  setLastHeartbeat: (t: number) => void;
  connectionDead: boolean;
  setConnectionDead: (v: boolean) => void;
  autoReconnectAttempts: number;
  maxAutoReconnectAttempts: number;
  incrementAutoReconnectAttempts: () => void;
  resetAutoReconnectAttempts: () => void;
  logSessions: LogSession[];
  currentSession: LogSession | null;
  startSession: (name: string) => void;
  stopSession: () => void;
  addLogEntry: (data: Partial<LiveData>, event?: string, severity?: 'info' | 'warning' | 'danger') => void;
  aiRecommendations: AiTuneRecommendation[];
  setAiRecommendations: (r: AiTuneRecommendation[]) => void;
  refreshAiAnalysis: () => void;
  refreshAiAnalysisAsync: () => Promise<void>;
  applyRecommendation: (id: string) => void;
  aiApiAvailable: boolean | null;
  setAiApiAvailable: (v: boolean | null) => void;
  aiIsThinking: boolean;
  setAiIsThinking: (v: boolean) => void;
  aiSummary: string;
  setAiSummary: (s: string) => void;
  aiSafetyAssessment: string;
  setAiSafetyAssessment: (s: string) => void;
  aiEstimatedHpGain: number;
  setAiEstimatedHpGain: (v: number) => void;
  aiConfidence: number;
  setAiConfidence: (v: number) => void;
  aiChatHistory: AiChatMessage[];
  setAiChatHistory: (h: AiChatMessage[]) => void;
  aiLastError: string | null;
  setAiLastError: (e: string | null) => void;
  sendAiChat: (question: string) => Promise<void>;
  gaugeLayouts: GaugeLayout[];
  activeGaugeLayout: string;
  setActiveGaugeLayout: (id: string) => void;
  activeScreen: string;
  setActiveScreen: (s: string) => void;
  isAiTuning: boolean;
  setIsAiTuning: (v: boolean) => void;
  showFlashModal: boolean;
  setShowFlashModal: (v: boolean) => void;
  showQuickSwitch: boolean;
  setShowQuickSwitch: (v: boolean) => void;
  notifications: { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  addNotification: (n: Omit<AppState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  selectedAdapterId: string | null;
  setSelectedAdapterId: (id: string | null) => void;
  adapterConfigs: Record<string, AdapterConfig>;
  updateAdapterConfig: (id: string, config: Partial<AdapterConfig>) => void;
  showAdapterSettings: boolean;
  setShowAdapterSettings: (v: boolean) => void;
  scannedAdapter: CableInfo | null;
  setScannedAdapter: (c: CableInfo | null) => void;
}

const defaultProfile: VehicleProfile = {
  id: 'default', name: 'My E60', vin: '', engine: 'n54', transmission: 'auto_6',
  injector: 'stock', hasUpgradedIntercooler: false, hasUpgradedTurbo: false,
  hasUpgradedFuelPump: false, hasUpgradedClutch: false, hasMethInjection: false,
  hasDownpipes: false, hasExhaust: false, hasUpgradedChargepipe: false,
  currentMap: 'stock', mileage: 0, notes: '',
};

const defaultLiveData: LiveData = {
  rpm: 0, speed: 0, coolantTemp: 0, oilTemp: 0, oilPressure: 0, boost: 0,
  iat: 0, afr: 0, throttle: 0, load: 0, timing: 0, fuelPressure: 0,
  battery: 12.6, knock: 0, lambda: 0, mapPressure: 0, maf: 0,
  fuelTrimShort: 0, fuelTrimLong: 0, dutyCycle: 0, tqActual: 0,
  tqRequested: 0, turbineInlet: 0, turbineOutlet: 0, timestamp: 0,
};

const defaultObd2: OBD2State = {
  connectionState: 'disconnected', cable: null, protocol: 'none', ecus: [],
  batteryVoltage: 12.6, ignitionState: 'off', engineRunning: false,
  vehicleSpeed: 0, rpm: 0, diagnostics: null, lastError: null,
  lastActivity: 0, autoConnect: true, dmeProtocolVersion: '',
};

const defaultAdapterConfigs: Record<string, AdapterConfig> = {
  'inpa_ftdi': {
    id: 'inpa_ftdi', name: 'BMW INPA K+DCAN (FTDI)', chip: 'FT232R',
    vid: '0x0403', pid: '0x6001', type: 'k_dcan_ftdi', isGenuine: true,
    baudRate: 10400, ftdiLatencyTimer: 2, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000, description: 'Genuine BMW INPA cable with FTDI FT232R chip. Most reliable for K-Line/D-CAN.',
  },
  'ftdi_ft232h': {
    id: 'ftdi_ft232h', name: 'FTDI FT232H K+DCAN', chip: 'FT232H',
    vid: '0x0403', pid: '0x6014', type: 'k_dcan_ftdi', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 1, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000, description: 'High-speed FTDI FT232H chip. Supports both K-Line and D-CAN with bus switching.',
  },
  'ch340': {
    id: 'ch340', name: 'K+DCAN Clone (CH340)', chip: 'CH340',
    vid: '0x1A86', pid: '0x7523', type: 'k_dcan_ch340', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 16, dtrRtsMode: 'kline',
    protocolPreference: 'kline', connectTimeout: 8000,
    testerPresentInterval: 2500, description: 'Common clone cable with CH340 chip. Slower latency timer, best for K-Line only.',
  },
  'ch341': {
    id: 'ch341', name: 'K+DCAN Clone (CH341A)', chip: 'CH341A',
    vid: '0x1A86', pid: '0x5523', type: 'k_dcan_ch340', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 16, dtrRtsMode: 'kline',
    protocolPreference: 'kline', connectTimeout: 8000,
    testerPresentInterval: 2500, description: 'CH341A variant clone cable. May have timing issues with D-CAN.',
  },
  'enet_cp2102': {
    id: 'enet_cp2102', name: 'ENET Cable (CP2102)', chip: 'CP2102',
    vid: '0x10C4', pid: '0xEA60', type: 'enet', isGenuine: false,
    baudRate: 1000000, ftdiLatencyTimer: 16, dtrRtsMode: 'none',
    protocolPreference: 'dcan', connectTimeout: 3000,
    testerPresentInterval: 2000, description: 'ENET adapter with Silicon Labs CP2102. For Ethernet-based diagnostics only.',
  },
  'bmw_enet': {
    id: 'bmw_enet', name: 'BMW ENET (Ethernet)', chip: 'N/A',
    vid: '0x0000', pid: '0x0000', type: 'enet', isGenuine: true,
    baudRate: 1000000, ftdiLatencyTimer: 16, dtrRtsMode: 'none',
    protocolPreference: 'dcan', connectTimeout: 3000,
    testerPresentInterval: 2000, description: 'Direct Ethernet ENET cable for F-series+ compatible E60. Requires RJ45 adapter.',
  },
  'custom': {
    id: 'custom', name: 'Custom Adapter', chip: 'Unknown',
    vid: '0x0000', pid: '0x0000', type: 'k_dcan_ftdi', isGenuine: false,
    baudRate: 10400, ftdiLatencyTimer: 2, dtrRtsMode: 'kline',
    protocolPreference: 'auto', connectTimeout: 5000,
    testerPresentInterval: 2000, description: 'Manually configured adapter. Set VID/PID and parameters to match your cable.',
  },
};

const defaultGaugeLayouts: GaugeLayout[] = [
  {
    id: 'default', name: 'Default', isDefault: true,
    gauges: [
      { id: 'rpm', type: 'rpm', position: { x: 0, y: 0, w: 4, h: 4 }, min: 0, max: 8000, warningThreshold: 6500, dangerThreshold: 7200, unit: 'RPM', label: 'RPM' },
      { id: 'boost', type: 'boost', position: { x: 4, y: 0, w: 4, h: 4 }, min: -1, max: 2.5, warningThreshold: 1.8, dangerThreshold: 2.2, unit: 'bar', label: 'Boost' },
      { id: 'coolant', type: 'coolant_temp', position: { x: 8, y: 0, w: 4, h: 4 }, min: 50, max: 130, warningThreshold: 105, dangerThreshold: 115, unit: '°C', label: 'Coolant' },
      { id: 'iat', type: 'iat', position: { x: 0, y: 4, w: 3, h: 3 }, min: 0, max: 80, warningThreshold: 55, dangerThreshold: 65, unit: '°C', label: 'IAT' },
      { id: 'afr', type: 'afr', position: { x: 3, y: 4, w: 3, h: 3 }, min: 0.7, max: 1.3, warningThreshold: 1.15, dangerThreshold: 0.75, unit: 'lambda', label: 'AFR' },
      { id: 'oil_temp', type: 'oil_temp', position: { x: 6, y: 4, w: 3, h: 3 }, min: 50, max: 150, warningThreshold: 125, dangerThreshold: 135, unit: '°C', label: 'Oil Temp' },
      { id: 'oil_pressure', type: 'oil_pressure', position: { x: 9, y: 4, w: 3, h: 3 }, min: 0, max: 6, warningThreshold: 1.5, dangerThreshold: 1.0, unit: 'bar', label: 'Oil Press' },
    ],
  },
  {
    id: 'performance', name: 'Performance', isDefault: false,
    gauges: [
      { id: 'rpm', type: 'rpm', position: { x: 0, y: 0, w: 6, h: 6 }, min: 0, max: 8000, warningThreshold: 6500, dangerThreshold: 7200, unit: 'RPM', label: 'RPM' },
      { id: 'boost', type: 'boost', position: { x: 6, y: 0, w: 6, h: 6 }, min: -1, max: 2.5, warningThreshold: 1.8, dangerThreshold: 2.2, unit: 'bar', label: 'Boost' },
      { id: 'tq', type: 'tq_actual', position: { x: 0, y: 6, w: 4, h: 3 }, min: 0, max: 800, warningThreshold: 600, dangerThreshold: 700, unit: 'Nm', label: 'Torque' },
      { id: 'load', type: 'load', position: { x: 4, y: 6, w: 4, h: 3 }, min: 0, max: 100, warningThreshold: 85, dangerThreshold: 95, unit: '%', label: 'Load' },
      { id: 'timing', type: 'timing', position: { x: 8, y: 6, w: 4, h: 3 }, min: -10, max: 40, warningThreshold: 35, dangerThreshold: 38, unit: '°', label: 'Timing' },
    ],
  },
  {
    id: 'turbo', name: 'Turbo Monitor', isDefault: false,
    gauges: [
      { id: 'boost', type: 'boost', position: { x: 0, y: 0, w: 6, h: 6 }, min: -1, max: 2.5, warningThreshold: 1.8, dangerThreshold: 2.2, unit: 'bar', label: 'Boost' },
      { id: 'turbine_in', type: 'turbine_inlet', position: { x: 6, y: 0, w: 3, h: 3 }, min: 400, max: 1000, warningThreshold: 850, dangerThreshold: 950, unit: '°C', label: 'Turbine In' },
      { id: 'turbine_out', type: 'turbine_outlet', position: { x: 9, y: 0, w: 3, h: 3 }, min: 300, max: 800, warningThreshold: 650, dangerThreshold: 750, unit: '°C', label: 'Turbine Out' },
      { id: 'iat', type: 'iat', position: { x: 0, y: 6, w: 3, h: 3 }, min: 0, max: 80, warningThreshold: 55, dangerThreshold: 65, unit: '°C', label: 'IAT' },
      { id: 'duty_cycle', type: 'duty_cycle', position: { x: 3, y: 6, w: 3, h: 3 }, min: 0, max: 100, warningThreshold: 85, dangerThreshold: 95, unit: '%', label: 'WG Duty' },
      { id: 'afr', type: 'afr', position: { x: 6, y: 6, w: 3, h: 3 }, min: 0.7, max: 1.3, warningThreshold: 1.15, dangerThreshold: 0.75, unit: 'lambda', label: 'AFR' },
      { id: 'fuel_pressure', type: 'fuel_pressure', position: { x: 9, y: 6, w: 3, h: 3 }, min: 2, max: 8, warningThreshold: 4.5, dangerThreshold: 4.0, unit: 'bar', label: 'Fuel Press' },
    ],
  },
];

export const useStore = create<AppState>((set, get) => ({
  connection: {
    connected: false, protocol: 'none', ecuConnected: false, batteryVoltage: 12.6,
    vehicleDetected: false, dmeDetected: false, egsDetected: false,
    dscDetected: false, kombiDetected: false,
  },
  setConnection: (c) => set((s) => ({ connection: { ...s.connection, ...c } })),
  obd2: defaultObd2,
  setObd2: (o) => set((s) => ({ obd2: { ...s.obd2, ...o } })),
  obd2Cable: null,
  setObd2Cable: (c) => set({ obd2Cable: c }),
  flashSession: null,
  setFlashSession: (f) => set({ flashSession: f }),
  flashBackups: [],
  addFlashBackup: (b) => set((s) => ({ flashBackups: [b, ...s.flashBackups].slice(0, 5) })),
  removeFlashBackup: (id) => set((s) => ({ flashBackups: s.flashBackups.filter(b => b.id !== id) })),
  dtcReadings: [],
  setDtcReadings: (r) => set({ dtcReadings: r }),
  profile: defaultProfile,
  updateProfile: (p) => set((s) => {
    const newProfile = { ...s.profile, ...p };
    if (p.engine || p.currentMap || p.injector) {
      const map = aiTuningEngine.generateMap(newProfile.engine, newProfile.currentMap, newProfile.injector, newProfile);
      return { profile: newProfile, currentMap: map };
    }
    return { profile: newProfile };
  }),
  currentMap: null,
  setCurrentMap: (m) => set({ currentMap: m }),
  generateMap: (mapType) => {
    const { profile } = get();
    const map = aiTuningEngine.generateMap(profile.engine, mapType, profile.injector, profile);
    set({ currentMap: map, profile: { ...profile, currentMap: mapType } });
  },
  liveData: defaultLiveData,
  updateLiveData: (d) => set((s) => ({ liveData: { ...s.liveData, ...d, timestamp: Date.now() } })),
  isLogging: false,
  setIsLogging: (v) => set({ isLogging: v }),
  obd2ConnectionPaused: false,
  setObd2ConnectionPaused: (v) => set({ obd2ConnectionPaused: v }),
  watchdogEnabled: true,
  setWatchdogEnabled: (v) => set({ watchdogEnabled: v }),
  lastHeartbeat: 0,
  setLastHeartbeat: (t) => set({ lastHeartbeat: t }),
  connectionDead: false,
  setConnectionDead: (v) => set({ connectionDead: v }),
  autoReconnectAttempts: 0,
  maxAutoReconnectAttempts: 5,
  incrementAutoReconnectAttempts: () => set((s) => ({ autoReconnectAttempts: s.autoReconnectAttempts + 1 })),
  resetAutoReconnectAttempts: () => set({ autoReconnectAttempts: 0 }),
  logSessions: [],
  currentSession: null,
  startSession: (name) => {
    set({ currentSession: {
      id: `session_${Date.now()}`, name, startTime: Date.now(), entries: [],
      engineType: get().profile.engine, mapType: get().profile.currentMap,
      maxRpm: 0, maxBoost: 0, maxSpeed: 0, maxIat: 0, knockEvents: 0, avgAfr: 1.0, aiRecommendations: [],
    }, isLogging: true });
  },
  stopSession: () => {
    const { currentSession } = get();
    if (currentSession) {
      set((s) => ({ logSessions: [{ ...currentSession, endTime: Date.now() }, ...s.logSessions], currentSession: null, isLogging: false }));
    }
  },
  addLogEntry: (data, event, severity) => {
    const { currentSession, isLogging } = get();
    if (!isLogging || !currentSession) return;
    const entry = { id: `entry_${Date.now()}`, timestamp: Date.now(), data, event, severity };
    set({ currentSession: {
      ...currentSession,
      entries: [...currentSession.entries, entry],
      maxRpm: Math.max(currentSession.maxRpm, data.rpm || 0),
      maxBoost: Math.max(currentSession.maxBoost, data.boost || 0),
      maxSpeed: Math.max(currentSession.maxSpeed, data.speed || 0),
      maxIat: Math.max(currentSession.maxIat, data.iat || 0),
      knockEvents: currentSession.knockEvents + (data.knock && data.knock > 0 ? 1 : 0),
    }});
  },
  aiRecommendations: [],
  setAiRecommendations: (r) => set({ aiRecommendations: r }),
  refreshAiAnalysis: () => {
    const { liveData, profile, currentMap } = get();
    if (!currentMap) return;
    set({ aiRecommendations: aiTuningEngine.analyzeLiveData(liveData, profile, currentMap) });
  },
  refreshAiAnalysisAsync: async () => {
    const { liveData, profile, currentMap } = get();
    if (!currentMap) return;
    set({ aiIsThinking: true });
    try {
      const result = await geminiAiService.analyzeLiveData(liveData, profile, currentMap);
      if (result) {
        set({
          aiRecommendations: result.recommendations,
          aiSummary: result.summary,
          aiSafetyAssessment: result.safetyAssessment,
          aiEstimatedHpGain: result.estimatedHpGain,
          aiConfidence: result.confidence,
          aiApiAvailable: true,
          aiIsThinking: false,
        });
      } else {
        set({
          aiRecommendations: aiTuningEngine.analyzeLiveData(liveData, profile, currentMap),
          aiApiAvailable: false,
          aiIsThinking: false,
        });
      }
    } catch {
      set({
        aiRecommendations: aiTuningEngine.analyzeLiveData(liveData, profile, currentMap),
        aiIsThinking: false,
        aiApiAvailable: false,
      });
    }
  },
  applyRecommendation: (id) => {
    const { aiRecommendations, currentMap } = get();
    const rec = aiRecommendations.find(r => r.id === id);
    if (!rec || !currentMap) return;
    const updatedMap = { ...currentMap };
    if (rec.type === 'timing') {
      updatedMap.timing = updatedMap.timing.map(t => ({ ...t, ignitionAdvance: rec.recommendedValue }));
    }
    set({ currentMap: updatedMap, aiRecommendations: aiRecommendations.filter(r => r.id !== id) });
  },
  aiApiAvailable: null,
  setAiApiAvailable: (v) => set({ aiApiAvailable: v }),
  aiIsThinking: false,
  setAiIsThinking: (v) => set({ aiIsThinking: v }),
  aiSummary: '',
  setAiSummary: (s) => set({ aiSummary: s }),
  aiSafetyAssessment: '',
  setAiSafetyAssessment: (s) => set({ aiSafetyAssessment: s }),
  aiEstimatedHpGain: 0,
  setAiEstimatedHpGain: (v) => set({ aiEstimatedHpGain: v }),
  aiConfidence: 0,
  setAiConfidence: (v) => set({ aiConfidence: v }),
  aiChatHistory: [],
  setAiChatHistory: (h) => set({ aiChatHistory: h }),
  aiLastError: null,
  setAiLastError: (e) => set({ aiLastError: e }),
  sendAiChat: async (question) => {
    const { liveData, profile, currentMap } = get();
    set({ aiIsThinking: true });
    try {
      const answer = await geminiAiService.chat(question, { data: liveData, profile, map: currentMap });
      set({
        aiChatHistory: [...get().aiChatHistory, { role: 'user', text: question, timestamp: Date.now() }, { role: 'model', text: answer, timestamp: Date.now() }],
        aiIsThinking: false,
        aiApiAvailable: true,
      });
    } catch (e) {
      set({
        aiChatHistory: [...get().aiChatHistory, { role: 'user', text: question, timestamp: Date.now() }, { role: 'model', text: `Error: ${(e as Error).message}`, timestamp: Date.now() }],
        aiIsThinking: false,
        aiApiAvailable: false,
      });
    }
  },
  gaugeLayouts: defaultGaugeLayouts,
  activeGaugeLayout: 'default',
  setActiveGaugeLayout: (id) => set({ activeGaugeLayout: id }),
  activeScreen: 'home',
  setActiveScreen: (s) => set({ activeScreen: s }),
  isAiTuning: false,
  setIsAiTuning: (v) => set({ isAiTuning: v }),
  showFlashModal: false,
  setShowFlashModal: (v) => set({ showFlashModal: v }),
  showQuickSwitch: false,
  setShowQuickSwitch: (v) => set({ showQuickSwitch: v }),
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, { ...n, id: `notif_${Date.now()}` }] })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  selectedAdapterId: null,
  setSelectedAdapterId: (id) => set({ selectedAdapterId: id }),
  adapterConfigs: defaultAdapterConfigs,
  updateAdapterConfig: (id, config) => set((s) => ({
    adapterConfigs: { ...s.adapterConfigs, [id]: { ...s.adapterConfigs[id], ...config } },
  })),
  showAdapterSettings: false,
  setShowAdapterSettings: (v) => set({ showAdapterSettings: v }),
  scannedAdapter: null,
  setScannedAdapter: (c) => set({ scannedAdapter: c }),
}));
