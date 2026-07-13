import { ScrollView, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { codingOperations } from '@/lib/coding-operations';
import { connectionManager } from '@/lib/connection-manager';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colors = useColors();
  const [connectionState, setConnectionState] = useState(connectionManager.getState());
  const [operationStatus, setOperationStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>(['BMW E60 Coder Pro initialized']);

  useEffect(() => {
    const handleStateChange = (state: any) => {
      setConnectionState(state);
      addLog(state.lastError || `Connection: ${state.isConnected ? 'CONNECTED' : 'Disconnected'}`);
    };

    connectionManager.on('state-change', handleStateChange);
    codingOperations.on('status', (status) => {
      setOperationStatus(status);
      addLog(status.message);
    });

    return () => connectionManager.removeListener('state-change', handleStateChange);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 30)]);
  };

  const handleConnect = async () => {
    Alert.alert('K+DCAN', 'Simulated connection - in real app this uses react-native-usb-serialport');
    const connected = await connectionManager.connect(null);
    if (connected) addLog('✅ K+DCAN Adapter Connected');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={{ gap: 20 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>🚗 BMW E60 Coder Pro</Text>
          
          <Pressable onPress={handleConnect} style={{ backgroundColor: colors.primary, padding: 20, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>Connect K+DCAN Cable</Text>
          </Pressable>

          <View style={{ gap: 12 }}>
            <Pressable onPress={() => codingOperations.enablePaddleShifters()} style={{ backgroundColor: '#111', padding: 16, borderRadius: 12 }}>
              <Text style={{ color: '#1e90ff' }}>🏎 Enable Paddle Shifters</Text>
            </Pressable>
            <Pressable onPress={() => codingOperations.clearAllFaults()} style={{ backgroundColor: '#111', padding: 16, borderRadius: 12 }}>
              <Text style={{ color: '#ff4444' }}>🗑️ Clear All Faults</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: '#111', padding: 16, borderRadius: 12, maxHeight: 200 }}>
            <Text style={{ color: '#888', marginBottom: 8 }}>LIVE LOG</Text>
            {logs.map((log, i) => <Text key={i} style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace' }}>{log}</Text>)}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}