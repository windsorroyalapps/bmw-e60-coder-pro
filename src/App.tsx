import { useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import { ConnectionBar } from '@/components/ConnectionBar';
import { FlashModal } from '@/components/FlashModal';
import { QuickSwitch } from '@/components/QuickSwitch';
import { OBDAdapterSettings } from '@/components/OBDAdapterSettings';
import { HomePage } from '@/pages/HomePage';
import { GaugeDashboard } from '@/components/GaugeDashboard';
import { TuningPage } from '@/pages/TuningPage';
import { AiAnalysisPage } from '@/pages/AiAnalysisPage';
import { LogsPage } from '@/pages/LogsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { GamepadPage } from '@/pages/GamepadPage';
import { DTCPage } from '@/pages/DTCPage';
import { useAndroidAutoProjection } from '@/hooks/useAndroidAutoProjection';
import { useConnectionWatchdog } from '@/hooks/useConnectionWatchdog';
import {
  Home, Gauge, Zap, Brain, FileText, Settings, Gamepad2, AlertTriangle
} from 'lucide-react';
import './App.css';

function App() {
  const {
    activeScreen,
    setActiveScreen,
    setShowQuickSwitch,
    obd2,
    updateLiveData,
    setObd2,
    isLogging,
    currentSession,
    addLogEntry,
    
    showAdapterSettings,
    setShowAdapterSettings,
    selectedAdapterId,
    setSelectedAdapterId,
    adapterConfigs,
    updateAdapterConfig,
  } = useStore();

  const unsubRef = useRef<(() => void) | null>(null);
  const liveUnsubRef = useRef<(() => void) | null>(null);

  useAndroidAutoProjection();
  useConnectionWatchdog();

  useEffect(() => {
    unsubRef.current = obd2Manager.subscribe((managerState) => {
      setObd2(managerState);
    });

    liveUnsubRef.current = obd2Manager.subscribe((managerState) => {
      if (managerState.connectionState === 'connected') {
        obd2Manager.readLiveData().then((data) => {
          if (data) {
            updateLiveData(data);
            if (isLogging && currentSession) {
              addLogEntry({
                timestamp: Date.now(),
                data,
              });
            }
          }
        });
      }
    });

    return () => {
      unsubRef.current?.();
      liveUnsubRef.current?.();
    };
  }, [setObd2, updateLiveData, isLogging, currentSession, addLogEntry]);

  useEffect(() => {
    if (obd2.connectionState === 'disconnected' && obd2.autoConnect) {
      obd2Manager.detectCable().then((cable) => {
        if (cable) {
          const adapterType = cable.type.includes('ELM327') ? 'ELM327' : 'AUTO';
          obd2Manager.connect(adapterType);
        }
      });
    }
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gauges', label: 'Gauges', icon: Gauge },
    { id: 'tuning', label: 'Tuning', icon: Zap },
    { id: 'ai', label: 'AI', icon: Brain },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'dtc', label: 'DTC', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'gamepad', label: 'Gamepad', icon: Gamepad2 },
  ];

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home': return <HomePage />;
      case 'gauges': return <GaugeDashboard />;
      case 'tuning': return <TuningPage />;
      case 'ai': return <AiAnalysisPage />;
      case 'logs': return <LogsPage />;
      case 'dtc': return <DTCPage />;
      case 'settings': return <SettingsPage />;
      case 'gamepad': return <GamepadPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <ConnectionBar />
      <div className="flex-1 overflow-hidden">
        {renderScreen()}
      </div>
      <nav className="h-16 bg-[#0d1117] border-t border-gray-800 flex items-center justify-around px-2 z-50">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'home') {
                  setShowQuickSwitch(true);
                } else {
                  setActiveScreen(item.id);
                }
              }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <FlashModal />
      <QuickSwitch />
      <OBDAdapterSettings
        isOpen={showAdapterSettings}
        onClose={() => setShowAdapterSettings(false)}
        selectedAdapterId={selectedAdapterId}
        onSelectAdapter={setSelectedAdapterId}
        adapterConfigs={adapterConfigs}
        onUpdateConfig={updateAdapterConfig}
      />
    </div>
  );
}

export default App;
