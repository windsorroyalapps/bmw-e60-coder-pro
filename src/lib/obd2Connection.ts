// BMW E60 Coder Pro - OBD2/K+DCAN Connection Manager
// 100% LIVE - All communication goes through the native Android USB bridge.
// No simulation, no mock data, no Math.random(). Real ECU communication only.

import { OBD2Bridge } from './nativeBridge';
import type {
  ConnectionDiagnostics,
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

export { ConnectionDiagnostics };

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
  diagnostics: ConnectionDiagnostics | null;
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
  private flashProgressListener: { remove: () => void } | null = null;
  private flashCompleteListener: { remove: () => void } | null = null;
  private flashErrorListener: { remove: () => void } | null = null;

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

  async detectCable(): Promise<CableInfo | null> {
    this.updateState({ connectionState: 'searching', lastError: null });
    try {
      const result = await OBD2Bridge.detectCable();
      if (result.found && result.cable) {
        const cable: CableInfo = {
          type: result.cable.type as CableType,
          vendorId: result.cable.vendorId,
          productId: result.cable.productId,
          serialNumber: result.cable.serialNumber,
          driverVersion: result.cable.driverVersion,
          baudRate: result.cable.baudRate,
          isGenuine: result.cable.isGenuine,
          detectedChip: result.cable.detectedChip as any,
        };
        this.updateState({ cable, lastError: null });
        return cable;
      } else {
        this.updateState({
          connectionState: 'error',
          lastError: result.error || 'No K+DCAN cable detected. Check USB OTG connection.',
        });
        return null;
      }
    } catch (e: any) {
      this.updateState({
        connectionState: 'error',
        lastError: 'Cable detection failed: ' + (e?.message || String(e)),
      });
      return null;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.state.cable) {
      const cable = await this.detectCable();
      if (!cable) return false;
    }
    this.updateState({ connectionState: 'connecting' });
    try {
      const result = await OBD2Bridge.connect();
      if (result.success) {
        const ecus: ECUInfo[] = (result.ecus || []).map(e => ({
          name: e.name,
          address: e.address,
          protocol: e.protocol,
          status: e.status as 'online' | 'offline' | 'faulty',
          firmwareVersion: e.firmwareVersion,
          lastResponse: e.lastResponse,
          faultCodes: e.faultCodes,
        }));
        this.updateState({
          connectionState: 'connected',
          protocol: (result.protocol || 'k_dcan') as ProtocolType,
          ecus,
          batteryVoltage: result.batteryVoltage || 12.6,
          ignitionState: (result.ignitionState || 'off') as any,
          engineRunning: result.engineRunning || false,
          diagnostics: result.diagnostics || null,
          lastError: null,
          lastActivity: Date.now(),
          dmeProtocolVersion: result.dmeProtocolVersion || '',
        });
        return true;
      } else {
        this.updateState({
          connectionState: 'error',
          lastError: result.error || 'Connection failed',
        });
        return false;
      }
    } catch (e: any) {
      this.updateState({
        connectionState: 'error',
        lastError: 'Connection error: ' + (e?.message || String(e)),
      });
      return false;
    }
  }

  disconnect(): void {
    OBD2Bridge.disconnect().catch(() => {});
    this.updateState({
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
      dmeProtocolVersion: '',
    });
    this.removeFlashListeners();
  }

  async readLiveData(): Promise<Record<string, number> | null> {
    try {
      const result = await OBD2Bridge.readLiveData();
      if (result.connected) {
        const data: Record<string, number> = {};
        for (const [key, value] of Object.entries(result)) {
          if (key !== 'connected' && key !== 'timestamp' && typeof value === 'number') {
            data[key] = value;
          }
        }
        this.updateState({ lastActivity: Date.now() });
        return data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async readPID(pid: string): Promise<number | null> {
    try {
      const result = await OBD2Bridge.readPID({ pid });
      return result.value;
    } catch (e) {
      return null;
    }
  }

  async readDMEInfo(): Promise<{ ecuType: string; software: string; vin: string; powerClass: string } | null> {
    try {
      const result = await OBD2Bridge.readDMEInfo();
      if (result.success) {
        return {
          ecuType: result.ecuType,
          software: result.software,
          vin: result.vin,
          powerClass: result.powerClass,
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async writeDMEParameter(parameter: string, value: number): Promise<boolean> {
    try {
      const result = await OBD2Bridge.writeDMEParameter({ parameter, value });
      return result.success;
    } catch (e) {
      return false;
    }
  }

  async startFlash(isLiveFlash: boolean = false): Promise<{ success: boolean; message: string; session?: FlashSession }> {
    if (this.state.connectionState !== 'connected') {
      return { success: false, message: 'Not connected to vehicle' };
    }
    if (this.state.batteryVoltage < 13.0) {
      return { success: false, message: `Battery voltage too low: ${this.state.batteryVoltage.toFixed(1)}V (need 13.0V+)` };
    }
    try {
      const result = await OBD2Bridge.startFlash({ isLiveFlash });
      if (result.success && result.session) {
        const session: FlashSession = {
          id: result.session.id,
          startTime: result.session.startTime,
          status: 'preparing',
          progress: 0,
          currentSector: 'Preparing...',
          sectorsTotal: result.session.sectorsTotal,
          sectorsComplete: 0,
          bytesWritten: 0,
          bytesTotal: result.session.bytesTotal,
          speed: 0,
          eta: result.session.eta,
          errors: [],
          isLiveFlash,
          vehicleSpeed: this.state.vehicleSpeed,
          batteryVoltage: this.state.batteryVoltage,
        };
        this.flashSession = session;
        this.emitFlash();
        this.setupFlashListeners();
        return { success: true, message: result.message, session };
      }
      return { success: false, message: result.message };
    } catch (e: any) {
      return { success: false, message: 'Flash start failed: ' + (e?.message || String(e)) };
    }
  }

  async executeFlash(): Promise<void> {
    if (!this.flashSession) return;
    try {
      await OBD2Bridge.executeFlash();
    } catch (e) {
      if (this.flashSession) {
        this.flashSession.status = 'error';
        this.flashSession.currentSector = 'Flash error';
        this.emitFlash();
      }
    }
  }

  async quickFlash(): Promise<{ success: boolean; message: string }> {
    if (this.state.connectionState !== 'connected') {
      return { success: false, message: 'Not connected' };
    }
    try {
      const result = await OBD2Bridge.quickFlash();
      return result;
    } catch (e: any) {
      return { success: false, message: 'Quick flash failed: ' + (e?.message || String(e)) };
    }
  }

  abortFlash(): void {
    OBD2Bridge.abortFlash().catch(() => {});
    if (this.flashSession) {
      this.flashSession.status = 'aborted';
      this.flashSession.currentSector = 'Flash aborted by user';
      this.emitFlash();
    }
  }

  async sendCANCommands(commands: import('./nativeBridge').CANCommand[]): Promise<boolean> {
    try {
      const result = await OBD2Bridge.sendCANCommands({ commands });
      return result.success;
    } catch (e) {
      return false;
    }
  }

  private setupFlashListeners() {
    this.removeFlashListeners();
    OBD2Bridge.addListener('flashProgress', (data: FlashProgressEvent) => {
      if (!this.flashSession) return;
      this.flashSession.progress = data.progress;
      this.flashSession.currentSector = data.currentSector;
      this.flashSession.sectorsComplete = data.sectorsComplete;
      this.flashSession.sectorsTotal = data.sectorsTotal;
      this.flashSession.speed = data.speed;
      this.flashSession.eta = data.eta;
      this.flashSession.status = 'flashing';
      this.emitFlash();
    }).then(l => { this.flashProgressListener = l; });
    OBD2Bridge.addListener('flashComplete', () => {
      if (!this.flashSession) return;
      this.flashSession.status = 'complete';
      this.flashSession.progress = 100;
      this.flashSession.currentSector = 'Flash complete!';
      this.flashSession.eta = 0;
      this.emitFlash();
      this.removeFlashListeners();
    }).then(l => { this.flashCompleteListener = l; });
    OBD2Bridge.addListener('flashError', (data: { status: string; error: string }) => {
      if (!this.flashSession) return;
      this.flashSession.status = 'error';
      this.flashSession.currentSector = data.error;
      this.flashSession.errors.push(data.error);
      this.emitFlash();
      this.removeFlashListeners();
    }).then(l => { this.flashErrorListener = l; });
  }

  private removeFlashListeners() {
    this.flashProgressListener?.remove();
    this.flashCompleteListener?.remove();
    this.flashErrorListener?.remove();
    this.flashProgressListener = null;
    this.flashCompleteListener = null;
    this.flashErrorListener = null;
  }

  private updateState(partial: Partial<OBD2State>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }
}

export const obd2Manager = new OBD2ConnectionManager();
