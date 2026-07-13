// BMW E60 Coder Pro - Global State Store
import { create } from 'zustand';
import type {
  MapType, LiveData, LogSession,
  PerformanceMap, VehicleProfile, AiTuneRecommendation, ConnectionStatus,
  GaugeLayout
} from '@/types';
import type { OBD2State, FlashSession, CableInfo } from '@/lib/obd2Connection';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { ENGINE_SPECS } from '@/lib/engineData';

interface AppState {
  // Connection
  connection: ConnectionStatus;
  setConnection: (c: Partial<ConnectionStatus>) => void;

  // OBD2 Connection
  obd2: OBD2State;
  setObd2: (o: Partial<OBD2State>) => void;
  obd2Cable: CableInfo | null;
  setObd2Cable: (c: CableInfo | null) => void;

  // Flash Session
  flashSession: FlashSession | null;
  setFlashSession: (f: FlashSession | null) => void;

  // Vehicle Profile
  profile: VehicleProfile;
  updateProfile: (p: Partial<VehicleProfile>) => void;

  // Current Map
  currentMap: PerformanceMap | null;
  setCurrentMap: (m: PerformanceMap) => void;
  generateMap: (mapType: MapType) => void;

  // Live Data
  liveData: LiveData;
  updateLiveData: (d: Partial<LiveData>) => void;
  isLogging: boolean;
  setIsLogging: (v: boolean) => void;

  // Logs
  logSessions: LogSession[];
  currentSession: LogSession | null;
  startSession: (name: string) => void;
  stopSession: () => void;
  addLogEntry: (data: Partial<LiveData>, event?: string, severity?: 'info' | 'warning' | 'danger') => void;

  // AI Recommendations
  aiRecommendations: AiTuneRecommendation[];
  setAiRecommendations: (r: AiTuneRecommendation[]) => void;
  refreshAiAnalysis: () => void;
  applyRecommendation: (id: string) => void;

  // Gauges
  gaugeLayouts: GaugeLayout[];
  activeGaugeLayout: string;
  setActiveGaugeLayout: (id: string) => void;

  // UI
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
  id: 'default', name: 'My E60', vin: 'WBANXXXXXX', engine: 'n54',
  transmission: 'auto_6', injector: 'stock',
  hasUpgradedIntercooler: false, hasUpgradedTurbo: false, hasUpgradedFuelPump: false,
  hasUpgradedClutch: false, hasMethInjection: false, hasDownpipes: false,
  hasExhaust: false, hasUpgradedChargepipe: false, currentMap: 'stock',
  mileage: 120000, notes: '',
};

const defaultLiveData: LiveData = {
  rpm: 850, speed: 0, coolantTemp: 92, oilTemp: 95, oilPressure: 2.2,
  boost: -0.7, iat: 35, afr: 1.0, throttle: 0, load: 12, timing: 15,
  fuelPressure: 5.0, battery: 14.2, knock: 0, lambda: 1.0, mapPressure: 0.95,
  maf: 15, fuelTrimShort: 0, fuelTrimLong: 2, dutyCycle: 3,
  tqActual: 45, tqRequested: 40, turbineInlet: 650, turbineOutlet: 480,
  timestamp: Date.now(),
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
  // Connection
  connection: {
    connected: true, protocol: 'k_dcan', ecuConnected: true,
    batteryVoltage: 14.2, vehicleDetected: true, dmeDetected: true,
    egsDetected: true, dscDetected: true, kombiDetected: true,
  },
  setConnection: (c) => set((s) => ({ connection: { ...s.connection, ...c } })),

  // OBD2
  obd2: defaultObd2,
  setObd2: (o) => set((s) => ({ obd2: { ...s.obd2, ...o } })),
  obd2Cable: null,
  setObd2Cable: (c) => set({ obd2Cable: c }),

  // Flash Session
  flashSession: null,
  setFlashSession: (f) => set({ flashSession: f }),

  // Profile
  profile: defaultProfile,
  updateProfile: (p) => set((s) => {
    const newProfile = { ...s.profile, ...p };
    if (p.engine || p.currentMap || p.injector) {
      const map = aiTuningEngine.generateMap(newProfile.engine, newProfile.currentMap, newProfile.injector, newProfile);
      return { profile: newProfile, currentMap: map };
    }
    return { profile: newProfile };
  }),

  // Current Map
  currentMap: null,
  setCurrentMap: (m) => set({ currentMap: m }),
  generateMap: (mapType) => {
    const { profile } = get();
    const map = aiTuningEngine.generateMap(profile.engine, mapType, profile.injector, profile);
    set({ currentMap: map, profile: { ...profile, currentMap: mapType } });
  },

  // Live Data
  liveData: defaultLiveData,
  updateLiveData: (d) => set((s) => ({ liveData: { ...s.liveData, ...d, timestamp: Date.now() } })),
  isLogging: false,
  setIsLogging: (v) => set({ isLogging: v }),

  // Logs
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

  // AI
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

  // Gauges
  gaugeLayouts: defaultGaugeLayouts,
  activeGaugeLayout: 'default',
  setActiveGaugeLayout: (id) => set({ activeGaugeLayout: id }),

  // UI
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

// Simulate live data
let simInterval: ReturnType<typeof setInterval> | null = null;
export function startLiveDataSimulation() {
  if (simInterval) return;
  simInterval = setInterval(() => {
    const store = useStore.getState();
    const { profile, isLogging, currentSession, obd2 } = store;
    const engine = ENGINE_SPECS[profile.engine];
    const baseRpm = store.liveData.rpm;
    const rpmVariation = Math.random() * 100 - 50;
    const newRpm = Math.max(700, Math.min(engine.revLimit, Math.round(baseRpm + rpmVariation)));
    const loadPercent = Math.min(100, Math.round((newRpm / engine.revLimit) * 100 * (0.3 + Math.random() * 0.7)));
    let boost = -0.7;
    if (engine.stockBoost && newRpm > 1800) {
      const mapMultipliers: Record<string, number> = { stock: 1, stage1: 1.3, stage2: 1.6, stage2plus: 1.9, stage3: 2.3, custom: 1.4, economy: 0.85, valet: 0.3, anti_theft: 0 };
      const mult = mapMultipliers[profile.currentMap] || 1;
      boost = Math.min(engine.maxSafeBoost! * mult, engine.stockBoost * mult * (loadPercent / 100) * (newRpm > 2500 ? 1 : newRpm / 2500));
      boost = Math.round(boost * 100) / 100;
    }
    const newData: Partial<typeof store.liveData> = {
      rpm: newRpm, speed: Math.round(newRpm * 0.015 + Math.random() * 5),
      coolantTemp: Math.min(110, 90 + loadPercent * 0.2 + Math.random() * 2),
      oilTemp: Math.min(140, 95 + loadPercent * 0.4 + Math.random() * 3),
      oilPressure: Math.max(1.5, 3.5 - newRpm * 0.0002 + Math.random() * 0.3),
      boost, iat: Math.min(70, 35 + loadPercent * 0.3 + (boost > 0 ? boost * 10 : 0)),
      afr: engine.fuelType === 'diesel' ? Math.round((1.2 + Math.random() * 0.2) * 100) / 100 : Math.round((loadPercent > 70 ? 0.82 + Math.random() * 0.05 : 1.0 + Math.random() * 0.05) * 100) / 100,
      throttle: Math.round(loadPercent * 0.9 + Math.random() * 5), load: loadPercent,
      timing: Math.round((engine.fuelType === 'diesel' ? 8 : 15 + (newRpm > 4000 ? 5 : 0) - (boost > 0.5 ? boost * 3 : 0) + Math.random() * 2) * 10) / 10,
      fuelPressure: Math.round((5 + boost * 0.5 + Math.random() * 0.2) * 10) / 10,
      battery: Math.round((14 + Math.random() * 0.4) * 10) / 10,
      knock: boost > 1.0 && Math.random() > 0.9 ? Math.round(Math.random() * 3) : 0,
      lambda: Math.round((1.0 + Math.random() * 0.1 - (loadPercent > 80 ? 0.15 : 0)) * 100) / 100,
      mapPressure: Math.round((0.95 + (boost > 0 ? boost * 0.1 : 0)) * 100) / 100,
      maf: Math.round(15 + loadPercent * 0.8 + Math.random() * 3),
      fuelTrimShort: Math.round((Math.random() * 6 - 3) * 10) / 10,
      fuelTrimLong: Math.round((2 + Math.random() * 2) * 10) / 10,
      dutyCycle: Math.round(Math.min(95, loadPercent * 0.6 + (boost > 0 ? boost * 20 : 0) + Math.random() * 3)),
      tqActual: Math.round(engine.stockTorque * (loadPercent / 100) * 1.2 + Math.random() * 20),
      tqRequested: Math.round(engine.stockTorque * (loadPercent / 100)),
      turbineInlet: engine.stockBoost ? Math.round(650 + boost * 150 + Math.random() * 30) : 0,
      turbineOutlet: engine.stockBoost ? Math.round(480 + boost * 100 + Math.random() * 20) : 0,
    };
    store.updateLiveData(newData);
    // Update OBD2 state if connected
    if (obd2.connectionState === 'connected') {
      store.setObd2({ rpm: newRpm, vehicleSpeed: newData.speed || 0, batteryVoltage: newData.battery || 14.2, lastActivity: Date.now() });
    }
    if (isLogging && currentSession) store.addLogEntry(newData);
  }, 500);
}
export function stopLiveDataSimulation() {
  if (simInterval) { clearInterval(simInterval); simInterval = null; }
}
