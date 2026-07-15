import { create } from 'zustand';
import type { TuningProfile, EngineType, LiveData, LogEntry, FlashBackup, LogSession, GaugeLayout } from '@/types';
import type { OBD2State, CableInfo, FlashSession } from '@/lib/obd2Connection';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import type { AdapterConfig } from '@/components/OBDAdapterSettings';
import { testConnection as testGeminiConnection } from '@/lib/geminiAiService';
import type { ChatMessage } from '@/lib/geminiAiService';

interface AppState {
  // Navigation
  activeScreen: string;
  setActiveScreen: (screen: string) => void;

  // OBD2
  obd2: OBD2State;
  setObd2: (state: OBD2State) => void;
  obd2Cable: CableInfo | null;
  setObd2Cable: (cable: CableInfo | null) => void;

  // Profile
  profile: TuningProfile;
  setProfile: (profile: TuningProfile) => void;

  // Live Data
  liveData: LiveData;
  updateLiveData: (data: Partial<LiveData>) => void;

  // Logging
  isLogging: boolean;
  setIsLogging: (logging: boolean) => void;
  logEntries: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;
  currentSession: LogSession | null;
  setCurrentSession: (session: LogSession | null) => void;
  startSession: (name: string) => void;
  stopSession: () => void;

  // Flash
  showFlashModal: boolean;
  setShowFlashModal: (show: boolean) => void;
  flashSession: FlashSession | null;
  setFlashSession: (session: FlashSession | null) => void;
  flashBackups: FlashBackup[];
  addFlashBackup: (backup: FlashBackup) => void;

  // Quick Switch
  showQuickSwitch: boolean;
  setShowQuickSwitch: (show: boolean) => void;

  // Gauge Layouts
  gaugeLayouts: GaugeLayout[];
  activeGaugeLayout: string;
  setActiveGaugeLayout: (id: string) => void;

  // AI Tuning
  aiRecommendations: any[];
  setAiRecommendations: (recs: any[]) => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;

  // Watchdog
  watchdogEnabled: boolean;
  setWatchdogEnabled: (enabled: boolean) => void;
  connectionDead: boolean;
  setConnectionDead: (dead: boolean) => void;
  autoReconnectAttempts: number;
  setAutoReconnectAttempts: (attempts: number) => void;
  maxAutoReconnectAttempts: number;
  obd2ConnectionPaused: boolean;
  setObd2ConnectionPaused: (paused: boolean) => void;

  // Notifications
  notifications: { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  addNotification: (n: Omit<AppState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  // AI Tuning (Gemini)
  aiApiAvailable: boolean;
  aiIsThinking: boolean;
  aiSummary: string;
  aiSafetyAssessment: string;
  aiEstimatedHpGain: number;
  aiConfidence: number;
  aiChatHistory: ChatMessage[];
  aiLastError: string | null;
  refreshAiAnalysisAsync: () => Promise<void>;
  sendAiChat: (message: string) => Promise<void>;
  setAiApiAvailable: (v: boolean) => void;
  // AI Live Tuning
  aiLiveTuningEnabled: boolean;
  setAiLiveTuningEnabled: (v: boolean) => void;
  aiLiveTuningAutoApply: boolean;
  setAiLiveTuningAutoApply: (v: boolean) => void;
  // OBD Adapter Settings
  selectedAdapterId: string | null;
  adapterConfigs: Record<string, Partial<AdapterConfig>>;
  showAdapterSettings: boolean;
  setShowAdapterSettings: (v: boolean) => void;
  setSelectedAdapterId: (id: string | null) => void;
  updateAdapterConfig: (id: string, config: Partial<AdapterConfig>) => void;
}

const DEFAULT_GAUGE_LAYOUTS: GaugeLayout[] = [
  {
    id: 'default',
    name: 'Default',
    isDefault: true,
    gauges: [
      { id: 'g1', type: 'rpm', position: { x: 0, y: 0, w: 6, h: 2 }, min: 0, max: 8000, warningThreshold: 6500, dangerThreshold: 7200, unit: 'RPM', label: 'Engine Speed' },
      { id: 'g2', type: 'boost', position: { x: 6, y: 0, w: 6, h: 2 }, min: -1, max: 2.5, warningThreshold: 1.8, dangerThreshold: 2.2, unit: 'bar', label: 'Boost' },
      { id: 'g3', type: 'afr', position: { x: 0, y: 2, w: 4, h: 2 }, min: 0.7, max: 1.3, warningThreshold: 1.1, dangerThreshold: 1.2, unit: 'lambda', label: 'AFR' },
      { id: 'g4', type: 'iat', position: { x: 4, y: 2, w: 4, h: 2 }, min: 0, max: 80, warningThreshold: 55, dangerThreshold: 65, unit: 'C', label: 'IAT' },
      { id: 'g5', type: 'coolant_temp', position: { x: 8, y: 2, w: 4, h: 2 }, min: 60, max: 130, warningThreshold: 105, dangerThreshold: 115, unit: 'C', label: 'Coolant' },
      { id: 'g6', type: 'throttle', position: { x: 0, y: 4, w: 3, h: 2 }, min: 0, max: 100, warningThreshold: 80, dangerThreshold: 95, unit: '%', label: 'Throttle' },
      { id: 'g7', type: 'load', position: { x: 3, y: 4, w: 3, h: 2 }, min: 0, max: 100, warningThreshold: 80, dangerThreshold: 95, unit: '%', label: 'Load' },
      { id: 'g8', type: 'timing', position: { x: 6, y: 4, w: 3, h: 2 }, min: -10, max: 40, warningThreshold: 30, dangerThreshold: 35, unit: 'deg', label: 'Timing' },
      { id: 'g9', type: 'battery', position: { x: 9, y: 4, w: 3, h: 2 }, min: 10, max: 16, warningThreshold: 12.5, dangerThreshold: 12.0, unit: 'V', label: 'Battery' },
    ],
  },
  {
    id: 'compact',
    name: 'Compact',
    isDefault: false,
    gauges: [
      { id: 'c1', type: 'rpm', position: { x: 0, y: 0, w: 4, h: 2 }, min: 0, max: 8000, warningThreshold: 6500, dangerThreshold: 7200, unit: 'RPM', label: 'RPM' },
      { id: 'c2', type: 'boost', position: { x: 4, y: 0, w: 4, h: 2 }, min: -1, max: 2.5, warningThreshold: 1.8, dangerThreshold: 2.2, unit: 'bar', label: 'Boost' },
      { id: 'c3', type: 'afr', position: { x: 8, y: 0, w: 4, h: 2 }, min: 0.7, max: 1.3, warningThreshold: 1.1, dangerThreshold: 1.2, unit: 'lambda', label: 'AFR' },
      { id: 'c4', type: 'coolant_temp', position: { x: 0, y: 2, w: 6, h: 2 }, min: 60, max: 130, warningThreshold: 105, dangerThreshold: 115, unit: 'C', label: 'Coolant' },
      { id: 'c5', type: 'iat', position: { x: 6, y: 2, w: 6, h: 2 }, min: 0, max: 80, warningThreshold: 55, dangerThreshold: 65, unit: 'C', label: 'IAT' },
    ],
  },
];

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  activeScreen: 'home',
  setActiveScreen: (screen) => set({ activeScreen: screen }),

  // OBD2
  obd2: {
    connectionState: 'disconnected',
    cable: null,
    protocol: 'none',
    ecus: [],
    batteryVoltage: 12.6,
    ignitionState: 'off',
    engineRunning: false,
    vehicleSpeed: 0,
    rpm: 0,
    diagnostics: null,
    lastError: null,
    lastActivity: 0,
    autoConnect: true,
    dmeProtocolVersion: '',
  },
  setObd2: (state) => set({ obd2: state }),
  obd2Cable: null,
  setObd2Cable: (cable) => set({ obd2Cable: cable }),

  // Profile
  profile: {
    year: '2008',
    engine: 'n54' as EngineType,
    currentMap: 'stock',
    transmission: 'auto',
    fuelOctane: 93,
    hasUpgradedIntercooler: false,
    hasUpgradedTurbo: false,
    hasUpgradedFuelPump: false,
    hasDownpipes: false,
    hasExhaust: false,
    hasMethInjection: false,
  },
  setProfile: (profile) => set({ profile }),

  // Live Data
  liveData: {
    rpm: 0,
    speed: 0,
    coolantTemp: 90,
    oilTemp: 95,
    oilPressure: 0,
    boost: 0,
    iat: 25,
    afr: 14.7,
    throttle: 0,
    load: 0,
    timing: 0,
    fuelPressure: 0,
    battery: 12.6,
    knock: 0,
    lambda: 1.0,
    mapPressure: 0,
    maf: 0,
    fuelTrimShort: 0,
    fuelTrimLong: 0,
    dutyCycle: 0,
    tqActual: 0,
    tqRequested: 0,
    turbineInlet: 0,
    turbineOutlet: 0,
    timestamp: Date.now(),
  },
  updateLiveData: (data) => set((s) => ({ liveData: { ...s.liveData, ...data } })),

  // Logging
  isLogging: false,
  setIsLogging: (logging) => set({ isLogging: logging }),
  logEntries: [],
  addLogEntry: (entry) => set((s) => ({
    logEntries: [...s.logEntries, { ...entry, id: `log_${Date.now()}` }]
  })),
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  startSession: (name: string) => {
    const session: LogSession = {
      id: `session_${Date.now()}`,
      name,
      startTime: Date.now(),
      entries: [],
      engineType: get().profile.engine,
      mapType: get().profile.currentMap as any,
      maxRpm: 0,
      maxBoost: 0,
      maxSpeed: 0,
      maxIat: 0,
      knockEvents: 0,
      avgAfr: 0,
      aiRecommendations: [],
    };
    set({ currentSession: session, isLogging: true });
  },
  stopSession: () => {
    const session = get().currentSession;
    if (session) {
      set({
        currentSession: { ...session, endTime: Date.now() },
        isLogging: false,
      });
    }
  },

  // Flash
  showFlashModal: false,
  setShowFlashModal: (show) => set({ showFlashModal: show }),
  flashSession: null,
  setFlashSession: (session) => set({ flashSession: session }),
  flashBackups: [],
  addFlashBackup: (backup) => set((s) => ({ flashBackups: [...s.flashBackups, backup] })),

  // Quick Switch
  showQuickSwitch: false,
  setShowQuickSwitch: (show) => set({ showQuickSwitch: show }),

  // Gauge Layouts
  gaugeLayouts: DEFAULT_GAUGE_LAYOUTS,
  activeGaugeLayout: 'default',
  setActiveGaugeLayout: (id) => set({ activeGaugeLayout: id }),

  // AI Tuning
  aiRecommendations: aiTuningEngine.analyzeLiveData({} as any, {
    engine: 'n54',
    currentMap: 'stock',
    hasUpgradedIntercooler: false,
    hasUpgradedTurbo: false,
    hasUpgradedFuelPump: false,
    hasDownpipes: false,
    hasExhaust: false,
    hasMethInjection: false,
  } as any, null),
  setAiRecommendations: (recs) => set({ aiRecommendations: recs }),
  aiChatOpen: false,
  setAiChatOpen: (open) => set({ aiChatOpen: open }),

  // Watchdog
  watchdogEnabled: true,
  setWatchdogEnabled: (enabled) => set({ watchdogEnabled: enabled }),
  connectionDead: false,
  setConnectionDead: (dead) => set({ connectionDead: dead }),
  autoReconnectAttempts: 0,
  setAutoReconnectAttempts: (attempts) => set({ autoReconnectAttempts: attempts }),
  maxAutoReconnectAttempts: 5,
  obd2ConnectionPaused: false,
  setObd2ConnectionPaused: (paused) => set({ obd2ConnectionPaused: paused }),

  // Notifications
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, { ...n, id: `notif_${Date.now()}` }] })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  // AI Tuning
  aiApiAvailable: false,
  aiIsThinking: false,
  aiSummary: '',
  aiSafetyAssessment: '',
  aiEstimatedHpGain: 0,
  aiConfidence: 0,
  aiChatHistory: [],
  aiLastError: null,
  refreshAiAnalysisAsync: async () => {
    const { liveData, profile, aiApiAvailable } = get();
    if (!aiApiAvailable) return;
    set({ aiIsThinking: true, aiLastError: null });
    try {
      const { analyzeLiveData } = await import('@/lib/geminiAiService');
      const result = await analyzeLiveData(
        liveData as unknown as Record<string, number>,
        profile.engine,
        profile.currentMap,
        [
          profile.hasUpgradedIntercooler ? 'Upgraded Intercooler' : '',
          profile.hasUpgradedTurbo ? 'Upgraded Turbo(s)' : '',
          profile.hasUpgradedFuelPump ? 'Upgraded Fuel Pump' : '',
          profile.hasDownpipes ? 'Downpipes' : '',
          profile.hasExhaust ? 'Catback Exhaust' : '',
          profile.hasMethInjection ? 'Methanol Injection' : '',
        ].filter(Boolean)
      );
      const recs = result.recommendations.map(r => ({
        id: `ai_${r.parameter}_${Date.now()}`,
        type: (r.parameter.toLowerCase().includes('timing') ? 'timing' :
              r.parameter.toLowerCase().includes('fuel') ? 'fuel' :
              r.parameter.toLowerCase().includes('boost') ? 'boost' :
              r.parameter.toLowerCase().includes('throttle') ? 'throttle' :
              r.parameter.toLowerCase().includes('vanos') ? 'vanos' : 'general') as any,
        severity: (r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'warning' : 'info') as any,
        message: `${r.parameter}: ${r.reason}`,
        parameter: r.parameter,
        currentValue: r.currentValue,
        recommendedValue: r.suggestedValue,
        reason: r.reason,
        confidence: Math.round(result.confidence),
        autoApplicable: r.priority !== 'high',
      }));
      set({
        aiIsThinking: false,
        aiSummary: result.summary,
        aiSafetyAssessment: result.safetyAssessment,
        aiEstimatedHpGain: result.estimatedHpGain,
        aiConfidence: result.confidence,
        aiRecommendations: recs,
      });
    } catch (err: any) {
      set({ aiIsThinking: false, aiLastError: err?.message || 'AI analysis failed' });
    }
  },
  sendAiChat: async (message: string) => {
    const { aiChatHistory, liveData, profile } = get();
    const newMsg: ChatMessage = { role: 'user', text: message, timestamp: Date.now() };
    const updatedHistory = [...aiChatHistory, newMsg];
    set({ aiChatHistory: updatedHistory, aiIsThinking: true });
    try {
      const { chat } = await import('@/lib/geminiAiService');
      const response = await chat(message, aiChatHistory, liveData as unknown as Record<string, number>, profile.engine);
      set({
        aiChatHistory: [...updatedHistory, { role: 'model', text: response, timestamp: Date.now() }],
        aiIsThinking: false,
      });
    } catch (err: any) {
      set({ aiIsThinking: false, aiLastError: err?.message || 'Chat failed' });
    }
  },
  setAiApiAvailable: (v) => set({ aiApiAvailable: v }),
  // AI Live Tuning
  aiLiveTuningEnabled: false,
  setAiLiveTuningEnabled: (v) => set({ aiLiveTuningEnabled: v }),
  aiLiveTuningAutoApply: false,
  setAiLiveTuningAutoApply: (v) => set({ aiLiveTuningAutoApply: v }),
  // OBD Adapter Settings
  selectedAdapterId: null,
  adapterConfigs: {},
  showAdapterSettings: false,
  setShowAdapterSettings: (v) => set({ showAdapterSettings: v }),
  setSelectedAdapterId: (id) => set({ selectedAdapterId: id }),
  updateAdapterConfig: (id, config) => set((s) => ({
    adapterConfigs: { ...s.adapterConfigs, [id]: { ...s.adapterConfigs[id], ...config } },
  })),
}));

// Test Gemini API on store initialization
testGeminiConnection().then((available) => {
  useStore.getState().setAiApiAvailable(available);
});
