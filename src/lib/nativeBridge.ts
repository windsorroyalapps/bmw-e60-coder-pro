// BMW E60 Coder Pro - Native Bridge
// TypeScript wrapper around the Capacitor OBD2Bridge native plugin.
// All methods call into the Android native layer for real USB OBD2 communication.

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface OBD2BridgePlugin {
  // Cable detection
  detectCable(): Promise<{
    found: boolean;
    cable?: CableInfo;
    error?: string;
  }>;

  // Connection management
  connect(): Promise<{
    success: boolean;
    protocol?: string;
    ecus?: ECUInfo[];
    batteryVoltage?: number;
    ignitionState?: string;
    engineRunning?: boolean;
    diagnostics?: ConnectionDiagnostics;
    dmeProtocolVersion?: string;
    error?: string;
  }>;
  disconnect(): Promise<{ success: boolean }>;
  getConnectionState(): Promise<{ connected: boolean; usbOpen: boolean }>;

  // Live data
  readLiveData(): Promise<LiveDataResponse>;
  readPID(options: { pid: string }): Promise<{ pid: string; value: number; timestamp: number }>;

  // DME operations
  readDMEInfo(): Promise<{ ecuType: string; software: string; vin: string; powerClass: string; success: boolean }>;
  writeDMEParameter(options: { parameter: string; value: number }): Promise<{ success: boolean; parameter: string; value: number }>;

  // Flashing
  startFlash(options: { isLiveFlash: boolean }): Promise<{
    success: boolean;
    message: string;
    session?: FlashSessionInfo;
  }>;
  executeFlash(): Promise<{ started: boolean }>;
  quickFlash(): Promise<{ success: boolean; message: string }>;
  abortFlash(): Promise<{ success: boolean }>;

  // CAN bus
  sendCANCommands(options: { commands: CANCommand[] }): Promise<{ success: boolean; sent: number }>;

  // Event listeners
  addListener(eventName: 'flashProgress', listenerFunc: (data: FlashProgressEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'flashComplete', listenerFunc: (data: { status: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'flashError', listenerFunc: (data: { status: string; error: string }) => void): Promise<PluginListenerHandle>;
}

export interface CableInfo {
  type: string;
  vendorId: string;
  productId: string;
  serialNumber: string;
  driverVersion: string;
  baudRate: number;
  isGenuine: boolean;
  detectedChip: string;
}

export interface ECUInfo {
  name: string;
  address: string;
  protocol: string;
  status: string;
  firmwareVersion: string;
  lastResponse: number;
  faultCodes: number;
}

export interface ConnectionDiagnostics {
  cableDetectTime: number;
  protocolNegotiateTime: number;
  ecuScanTime: number;
  totalConnectTime: number;
  retries: number;
  errors: string[];
}

export interface LiveDataResponse {
  connected: boolean;
  timestamp?: number;
  [key: string]: number | boolean | undefined;
}

export interface FlashSessionInfo {
  id: string;
  startTime: number;
  status: string;
  progress: number;
  currentSector: string;
  sectorsTotal: number;
  sectorsComplete: number;
  bytesWritten: number;
  bytesTotal: number;
  speed: number;
  eta: number;
  isLiveFlash: boolean;
  batteryVoltage: number;
}

export interface FlashProgressEvent {
  progress: number;
  currentSector: string;
  sectorsComplete: number;
  sectorsTotal: number;
  speed: number;
  eta: number;
}

export interface CANCommand {
  arbitrationId: string;
  data: string;
}

// Register the native plugin
export const OBD2Bridge = registerPlugin<OBD2BridgePlugin>('OBD2Bridge', {
  web: () => {
    // Web fallback - returns empty/no-op implementations
    // The web build will show "Connect cable" prompts since there's no real OBD2
    return {
      detectCable: async () => ({ found: false, error: 'Native OBD2 only available on Android' }),
      connect: async () => ({ success: false, error: 'Native OBD2 only available on Android' }),
      disconnect: async () => ({ success: true }),
      getConnectionState: async () => ({ connected: false, usbOpen: false }),
      readLiveData: async () => ({ connected: false }),
      readPID: async () => ({ pid: '', value: 0, timestamp: 0 }),
      readDMEInfo: async () => ({ ecuType: '', software: '', vin: '', powerClass: '', success: false }),
      writeDMEParameter: async () => ({ success: false, parameter: '', value: 0 }),
      startFlash: async () => ({ success: false, message: 'Native OBD2 only available on Android' }),
      executeFlash: async () => ({ started: false }),
      quickFlash: async () => ({ success: false, message: 'Native OBD2 only available on Android' }),
      abortFlash: async () => ({ success: true }),
      sendCANCommands: async () => ({ success: false, sent: 0 }),
      addListener: async () => ({ remove: () => {} } as PluginListenerHandle),
    } as OBD2BridgePlugin;
  },
});