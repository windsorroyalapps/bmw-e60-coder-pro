// BMW E60 Coder Pro - OBD2/K+DCAN Connection Manager
// 100% LIVE - All communication goes through the native Android USB bridge.
// No simulation, no mock data, no Math.random(). Real ECU communication only.

import { OBD2Bridge } from './nativeBridge';
import type {
  FlashProgressEvent,
} from './nativeBridge';

export type ConnectionState = 'disconnected' | 'searching' | 'connecting' | 'handshaking' | 'connected' | 'error';
export type CableType = 'k_dcan_ftdi' | 'k_dcan_ch340' | 'enet' | 'elm327_bt' | 'elm327_wifi' | 'unknown' | 'none';
export type ProtocolType = 'k_line' | 'd_can' | 'k_dcan' | 'enet' | 'obd2' | 'none';

export interface CableInfo {
  type: CableType;
  vendorId: string;
  productId: string;
  serialNumber: string;
  driverVersion: string;
  baudRate: number;
  isGenuine: boolean;
  detectedChip: 'FTDI_FT232R' | 'FTDI_FT232H' | 'CH340' | 'CH341' | 'CP2102' | 'unknown';
}

export interface ECUInfo {
  name: string;
  address: string;
  protocol: string;
  status: 'online' | 'offline' | 'faulty';
  firmwareVersion?: string;
  lastResponse: number;
  faultCodes: number;
}

export interface FlashSession {
  id: string;
  startTime: number;
  status: 'preparing' | 'flashing' | 'verifying' | 'complete' | 'error' | 'aborted';
  progress: number;
  currentSector: string;
  sectorsTotal: number;
  sectorsComplete: number;
  bytesWritten: number;
  bytesTotal: number;
  speed: number;
  eta: number;
  errors: string[];
  isLiveFlash: boolean;
  vehicleSpeed: number;
  batteryVoltage: number;
}

export interface OBD2State {
  connectionState: ConnectionState;
  cable: CableInfo | null;
  protocol: ProtocolType;
  ecus: ECUInfo[];
  batteryVoltage: number;
  ignitionState: 'off' | 'acc' | 'on' | 'start';
  engineRunning: boolean;
  vehicleSpeed: number;
  rpm: number;
  diagnostics: any | null;
  lastError: string | null;
  lastActivity: number;
  autoConnect: boolean;
  dmeProtocolVersion: string;
}

export class OBD2ConnectionManager {
  private state: OBD2State = {
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
  };

  private listeners: ((state: OBD2State) => void)[] = [];
  private flashListeners: ((session: FlashSession) => void)[] = [];
  private flashSession: FlashSession | null = null;

  // Connection watchdog
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;
  private heartbeatTimeoutMs: number = 500;
  private onConnectionDeadCallback: (() => void) | null = null;

  subscribe(callback: (state: OBD2State) => void) {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit() {
    this.listeners.forEach(l => l(this.state));
  }

  subscribeFlash(callback: (session: FlashSession) => void) {
    this.flashListeners.push(callback);
    if (this.flashSession) callback(this.flashSession);
    return () => {
      this.flashListeners = this.flashListeners.filter(l => l !== callback);
    };
  }

  private emitFlash() {
    if (this.flashSession) {
      this.flashListeners.forEach(l => l(this.flashSession!));
    }
  }

  getState(): OBD2State {
    return { ...this.state };
  }

  // === Cable Detection ===
  async detectCable(): Promise<CableInfo | null> {
    try {
      const result = await OBD2Bridge.detectCable();
      if (result.found && result.cable) {
        this.state.cable = result.cable;
        this.emit();
        return result.cable;
      }
      return null;
    } catch {
      return null;
    }
  }

  // === Connection ===
  async connect(): Promise<boolean> {
    this.state.connectionState = 'connecting';
    this.emit();

    try {
      const result = await OBD2Bridge.connect();
      if (result.success) {
        this.state.connectionState = 'handshaking';
        this.emit();

        // ECUs returned from connect
        if (result.ecus && result.ecus.length > 0) {
          this.state.ecus = result.ecus as ECUInfo[];
        }
        if (result.batteryVoltage) {
          this.state.batteryVoltage = result.batteryVoltage;
        }
        if (result.protocol) {
          this.state.protocol = result.protocol as ProtocolType;
        }

        this.state.connectionState = 'connected';
        this.state.lastActivity = Date.now();
        this.emit();
        this.startWatchdog();
        return true;
      } else {
        this.state.connectionState = 'error';
        this.state.lastError = result.error || 'Connection failed';
        this.emit();
        return false;
      }
    } catch (err: any) {
      this.state.connectionState = 'error';
      this.state.lastError = err?.message || 'Connection failed';
      this.emit();
      return false;
    }
  }

  disconnect() {
    try {
      OBD2Bridge.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    this.state.connectionState = 'disconnected';
    this.state.cable = null;
    this.state.protocol = 'none';
    this.state.ecus = [];
    this.state.diagnostics = null;
    this.state.lastError = null;
    this.state.dmeProtocolVersion = '';
    this.emit();
    this.stopWatchdog();
  }

  // === Live Data ===
  async readLiveData(): Promise<Record<string, number> | null> {
    try {
      const data = await OBD2Bridge.readLiveData();
      if (data && data.connected !== false) {
        this.state.lastActivity = Date.now();
        // Convert LiveDataResponse to Record<string, number>
        const numericData: Record<string, number> = {};
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'connected' && key !== 'timestamp' && typeof value === 'number') {
            numericData[key] = value;
          }
        }
        if (numericData.battery) this.state.batteryVoltage = numericData.battery;
        if (numericData.rpm) this.state.rpm = numericData.rpm;
        return numericData;
      }
      return null;
    } catch {
      return null;
    }
  }

  // === Flash / Backup ===
  async addBackupProgressListener(callback: (event: FlashProgressEvent) => void): Promise<() => void> {
    const handle = await OBD2Bridge.addListener('backupProgress', callback);
    return () => handle.remove();
  }

  async backupDME(): Promise<{ success: boolean; backup?: any; error?: string }> {
    try {
      return await OBD2Bridge.backupDME();
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  async restoreDME(backupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await OBD2Bridge.restoreDME({ backupId });
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  async readDMEInfo(): Promise<{ vin: string; ecuType: string; software: string } | null> {
    try {
      const result = await OBD2Bridge.readDMEInfo();
      if (result.success) {
        return { vin: result.vin, ecuType: result.ecuType, software: result.software };
      }
      return null;
    } catch {
      return null;
    }
  }

  async startFlash(isLive: boolean): Promise<{ success: boolean; session?: FlashSession }> {
    try {
      const result = await OBD2Bridge.startFlash({ isLiveFlash: isLive });
      if (result.success && result.session) {
        this.flashSession = result.session as unknown as FlashSession;
        this.emitFlash();
      }
      return { success: result.success, session: this.flashSession || undefined };
    } catch (err: any) {
      return { success: false };
    }
  }

  executeFlash() {
    OBD2Bridge.executeFlash();
  }

  abortFlash() {
    OBD2Bridge.abortFlash();
    if (this.flashSession) {
      this.flashSession.status = 'aborted';
      this.emitFlash();
    }
  }

  // === Watchdog ===
  enableWatchdog(timeoutMs: number = 500, onDead: () => void) {
    this.heartbeatTimeoutMs = timeoutMs;
    this.onConnectionDeadCallback = onDead;
    this.startWatchdog();
  }

  disableWatchdog() {
    this.onConnectionDeadCallback = null;
    this.stopWatchdog();
  }

  private startWatchdog() {
    if (this.watchdogTimer) return;
    this.lastHeartbeat = Date.now();
    this.watchdogTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeat;
      if (elapsed > this.heartbeatTimeoutMs) {
        if (this.onConnectionDeadCallback) {
          this.onConnectionDeadCallback();
        }
      }
    }, 100);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  heartbeat() {
    this.lastHeartbeat = Date.now();
  }
}

export const obd2Manager = new OBD2ConnectionManager();
export default obd2Manager;
