import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { startLiveDataSimulation, stopLiveDataSimulation } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import { ConnectionBar } from '@/components/ConnectionBar';
import { FlashModal } from '@/components/FlashModal';
import { QuickSwitch } from '@/components/QuickSwitch';
import { HomePage } from '@/pages/HomePage';
import { GaugeDashboard } from '@/components/GaugeDashboard';
import { TuningPage } from '@/pages/TuningPage';
import { AiAnalysisPage } from '@/pages/AiAnalysisPage';
import { LogsPage } from '@/pages/LogsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { GamepadPage } from '@/pages/GamepadPage';
import {
  Home, Gauge, Zap, Brain, FileText, Settings, Shuffle, Gamepad2
} from 'lucide-react';
import './App.css';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'gauges', label: 'Gauges', icon: Gauge },
  { id: 'tuning', label: 'Tuning', icon: Zap },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'gamepad', label: 'Drive', icon: Gamepad2 },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'settings', label: 'Setup', icon: Settings },
];

function App() {
  const { activeScreen, setActiveScreen, setShowQuickSwitch, obd2 } = useStore();

  useEffect(() => {
    startLiveDataSimulation();
    return () => stopLiveDataSimulation();
  }, []);

  // Sync OBD2 state with store
  useEffect(() => {
    const unsub = obd2Manager.subscribe((state) => {
      useStore.getState().setObd2(state);
    });
    return unsub;
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home': return <HomePage />;
      case 'gauges': return <GaugeDashboard />;
      case 'tuning': return <TuningPage />;
      case 'ai': return <AiAnalysisPage />;
      case 'logs': return <LogsPage />;
      case 'gamepad': return <GamepadPage />;
      case 'settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Connection Bar - Always visible when connected */}
      <ConnectionBar />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {renderScreen()}

        {/* Floating Quick Switch Button (Gauges page only) */}
        {activeScreen === 'gauges' && obd2.connectionState === 'connected' && (
          <button
            onClick={() => setShowQuickSwitch(true)}
            className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Quick Map Switch"
          >
            <Shuffle className="w-5 h-5 text-white" />
          </button>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-[#0d1117] border-t border-gray-800 z-50">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[64px] transition-colors relative ${
                activeScreen === item.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeScreen === item.id ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {activeScreen === item.id && (
                <div className="absolute -bottom-0 w-8 h-0.5 bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <FlashModal />
      <QuickSwitch />
    </div>
  );
}

export default App;
