import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { DTCReading } from '@/types';

export interface OBD2BridgePlugin {
  detectCable(): Promise<{
    found: boolean;
    cables?: CableInfo[];
    count?: number;
    error?: string;
  }>;

  connect(options?: { adapterType?: 'AUTO' | 'KDCAN' | 'ELM327' }): Promise<{
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

  readLiveData(): Promise<LiveDataResponse>;
  readPID(options: { pid: string }): Promise<{ pid: string; value: number; timestamp: number }>;

  readDMEInfo(): Promise<{ ecuType: string; software: string; vin: string; powerClass: string; success: boolean }>;
  writeDMEParameter(options: { parameter: string; value: number }): Promise<{ success: boolean; parameter: string; value: number }>;

  startFlash(options: { isLiveFlash: boolean }): Promise<{
    success: boolean;
    message: string;
    session?: FlashSessionInfo;
  }>;
  executeFlash(): Promise<{ started: boolean }>;
  quickFlash(): Promise<{ success: boolean; message: string }>;
  abortFlash(): Promise<{ success: boolean }>;

  sendCANCommands(options: { commands: CANCommand[] }): Promise<{ success: boolean; sent: number }>;

  backupDME(): Promise<{
    success: boolean;
    backup?: BackupInfo;
    error?: string;
  }>;
  restoreDME(options: { backupId: string }): Promise<{
    success: boolean;
    sectorsRestored: number;
    sectorsTotal: number;
    error?: string;
  }>;

  readDTCs(): Promise<{ readings: DTCReading[] }>;
  clearDTCs(options: { ecuAddress?: string }): Promise<{ success: boolean; cleared: number }>;

  addListener(eventName: 'flashProgress', listenerFunc: (data: FlashProgressEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'flashComplete', listenerFunc: (data: { status: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'flashError', listenerFunc: (data: { status: string; error: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'backupProgress', listenerFunc: (data: { progress: number; currentSector: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'usbDeviceEvent', listenerFunc: (data: { event: 'attached' | 'detached'; deviceName: string }) => void): Promise<PluginListenerHandle>;
}

export interface CableInfo {
  type: string;
  vendorId: number;
  productId: number;
  serialNumber: string;
  driverVersion: string;
  baudRate: number;
  isGenuine: boolean;
  detectedChip: string;
  hasPermission: boolean;
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

export interface BackupInfo {
  id: string;
  createdAt: number;
  vin: string;
  ecuType: string;
  softwareVersion: string;
  engineType: string;
  mapType: string;
  batteryVoltage: number;
  sectors: BackupSectorInfo[];
  totalBytes: number;
  status: string;
  progress: number;
}

export interface BackupSectorInfo {
  name: string;
  startAddress: string;
  size: number;
  checksum: string;
  backedUp: boolean;
}

export type { DTCReading };

export const OBD2Bridge = registerPlugin<OBD2BridgePlugin>('OBD2Bridge', {
  web: () => ({
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
    backupDME: async () => ({ success: false, error: 'Native backup not available on web' }),
    restoreDME: async () => ({ success: false, sectorsRestored: 0, sectorsTotal: 0, error: 'Native restore not available on web' }),
    readDTCs: async () => ({ readings: [] }),
    clearDTCs: async () => ({ success: false, cleared: 0 }),
    addListener: async () => ({ remove: () => {} } as PluginListenerHandle),
  } as OBD2BridgePlugin),
});
