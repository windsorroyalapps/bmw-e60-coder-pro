// BMW E60 Coder Pro - Global State Store
// 100% LIVE - All data comes from real OBD2 via native Android bridge.
// No simulation. No mock data. No Math.random().

import { create } from 'zustand';
import type {
  MapType, LiveData, LogSession,
  PerformanceMap, VehicleProfile, AiTuneRecommendation, ConnectionStatus,
  GaugeLayout
} from '@/types';
import type { OBD2State, FlashSession, CableInfo } from '@/lib/obd2Connection';
import { aiTuningEngine } from '@/lib/aiTuningEngine';

interface AppState {
  connection: ConnectionStatus;
  setConnection: (c: Partial<ConnectionStatus>) => void;
  obd2: OBD2State;
  setObd2: (o: Partial<OBD2State>) => void;
  obd2Cable: CableInfo | null;
  setObd2Cable: (c: CableInfo | null) => void;
  flashSession: FlashSession | null;
  setFlashSession: (f: FlashSession | null) => void;
  profile: VehicleProfile;
  updateProfile: (p: Partial<VehicleProfile>) => void;
  currentMap: PerformanceMap | null;
  setCurrentMap: (m: PerformanceMap) => void;
  generateMap: (mapType: MapType) => void;
  liveData: LiveData;
  updateLiveData: (d: Partial<LiveData>) => void;
  isLogging: boolean;
  setIsLogging: (v: boolean) => void;
  logSessions: LogSession[];
  currentSession: LogSession | null;
  startSession: (name: string) => void;
  stopSession: () => void;
  addLogEntry: (data: Partial<LiveData>, event?: string, severity?: 'info' | 'warning' | 'danger') => void;
  aiRecommendations: AiTuneRecommendation[];
  setAiRecommendations: (r: AiTuneRecommendation[]) => void;
  refreshAiAnalysis: () => void;
  applyRecommendation: (id: string) => void;
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
  setIsLogging: (v) => set({ isAiTuning: v }),
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
}));