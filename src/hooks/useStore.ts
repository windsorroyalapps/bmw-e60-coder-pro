import { create } from 'zustand';
import type { TuningProfile, EngineType, OBD2Data, LogEntry, FlashBackup } from '@/types';
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
  liveData: OBD2Data;
  updateLiveData: (data: Partial<OBD2Data>) => void;
  
  // Logging
  isLogging: boolean;
  setIsLogging: (logging: boolean) => void;
  logEntries: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;
  currentSession: string | null;
  setCurrentSession: (session: string | null) => void;
  
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
  
  // AI Tuning
  aiRecommendations: ReturnType<typeof aiTuningEngine.analyze>;
  setAiRecommendations: (recs: ReturnType<typeof aiTuningEngine.analyze>) => void;
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
    boost: 0,
    afr: 14.7,
    iat: 25,
    coolantTemp: 90,
    oilTemp: 95,
    timing: 0,
    knock: 0,
    load: 0,
    throttle: 0,
    fuelTrimShort: 0,
    fuelTrimLong: 0,
    dutyCycle: 0,
    oilPressure: 0,
    batteryVoltage: 12.6,
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
  
  // AI Tuning
  aiRecommendations: aiTuningEngine.analyze({}, {
    engine: 'n54',
    currentMap: 'stock',
    hasUpgradedIntercooler: false,
    hasUpgradedTurbo: false,
    hasUpgradedFuelPump: false,
    hasDownpipes: false,
    hasExhaust: false,
    hasMethInjection: false,
  } as TuningProfile),
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
