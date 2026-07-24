import { OBD2Bridge } from './nativeBridge';
import type { FlashProgressEvent, CableInfo } from './nativeBridge';

export type { CableInfo };

export type ConnectionState = 'disconnected' | 'searching' | 'connecting' | 'handshaking' | 'connected' | 'error';
export type CableType = 'k_dcan_ftdi' | 'k_dcan_ch340' | 'enet' | 'elm327_bt' | 'elm327_wifi' | 'unknown' | 'none';
export type ProtocolType = 'k_line' | 'd_can' | 'k_dcan' | 'enet' | 'obd2' | 'none';

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
  private usbEventUnsub: (() => void) | null = null;

  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;
  private heartbeatTimeoutMs: number = 2000;
  private onConnectionDeadCallback: (() => void) | null = null;
  private liveDataTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.registerUsbListener();
  }

  private registerUsbListener() {
    OBD2Bridge.addListener('usbDeviceEvent', (event) => {
      if (event.event === 'attached') {
        if (this.state.autoConnect && this.state.connectionState === 'disconnected') {
          this.connect('AUTO');
        }
      } else if (event.event === 'detached') {
        this.disconnect();
      }
    }).then(handle => {
      this.usbEventUnsub = () => handle.remove();
    });
  }

  subscribe(callback: (state: OBD2State) => void) {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  subscribeFlash(callback: (session: FlashSession) => void) {
    this.flashListeners.push(callback);
    if (this.flashSession) callback(this.flashSession);
    return () => {
      this.flashListeners = this.flashListeners.filter(l => l !== callback);
    };
  }

  private emitFlash() {
    const session = this.flashSession;
    if (session) {
      this.flashListeners.forEach(l => l(session));
    }
  }

  getState(): OBD2State {
    return { ...this.state };
  }

  async detectCable(): Promise<CableInfo | null> {
    this.state.connectionState = 'searching';
    this.emit();
    try {
      const result = await OBD2Bridge.detectCable();
      if (result.found && result.cables && result.cables.length > 0) {
        const cable = result.cables[0];
        this.state.cable = cable;
        this.emit();
        return cable;
      }
      this.state.connectionState = 'disconnected';
      this.emit();
      return null;
    } catch (err: any) {
      this.state.lastError = err?.message || 'Cable detection failed';
      this.state.connectionState = 'error';
      this.emit();
      return null;
    }
  }

  async connect(adapterType: 'AUTO' | 'KDCAN' | 'ELM327' = 'AUTO'): Promise<boolean> {
    if (this.state.connectionState === 'connected') return true;

    this.state.connectionState = 'connecting';
    this.state.lastError = null;
    this.emit();

    try {
      const result = await OBD2Bridge.connect({ adapterType });
      if (result.success) {
        this.state.connectionState = 'handshaking';
        this.emit();

        if (result.ecus && result.ecus.length > 0) {
          this.state.ecus = result.ecus as unknown as ECUInfo[];
        }
        if (result.batteryVoltage !== undefined) {
          this.state.batteryVoltage = result.batteryVoltage;
        }
        if (result.protocol) {
          this.state.protocol = result.protocol as ProtocolType;
        }
        if (result.ignitionState) {
          this.state.ignitionState = result.ignitionState as OBD2State['ignitionState'];
        }
        if (result.engineRunning !== undefined) {
          this.state.engineRunning = result.engineRunning;
        }
        if (result.dmeProtocolVersion) {
          this.state.dmeProtocolVersion = result.dmeProtocolVersion;
        }
        if (result.diagnostics) {
          this.state.diagnostics = result.diagnostics;
        }

        this.state.connectionState = 'connected';
        this.state.lastActivity = Date.now();
        this.emit();
        this.startWatchdog();
        this.startLiveDataPolling();
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

  async disconnect() {
    try {
      await OBD2Bridge.disconnect();
    } catch {
      // Ignore
    }
    this.state.connectionState = 'disconnected';
    this.state.cable = null;
    this.state.protocol = 'none';
    this.state.ecus = [];
    this.state.diagnostics = null;
    this.state.lastError = null;
    this.state.dmeProtocolVersion = '';
    this.state.engineRunning = false;
    this.state.ignitionState = 'off';
    this.emit();
    this.stopWatchdog();
    this.stopLiveDataPolling();
  }

  async readLiveData(): Promise<Record<string, number> | null> {
    try {
      const data = await OBD2Bridge.readLiveData();
      if (data && data.connected !== false) {
        this.state.lastActivity = Date.now();
        this.heartbeat();

        const numericData: Record<string, number> = {};
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'connected' && key !== 'timestamp' && typeof value === 'number') {
            numericData[key] = value;
          }
        }

        const mapped: Record<string, number> = {};
        if (numericData.rpm !== undefined) mapped.rpm = numericData.rpm;
        if (numericData.voltage !== undefined) mapped.battery = numericData.voltage;
        if (numericData.coolant_temp !== undefined) mapped.coolantTemp = numericData.coolant_temp;
        if (numericData.oil_temp !== undefined) mapped.oilTemp = numericData.oil_temp;
        if (numericData.boost_actual !== undefined) mapped.boost = numericData.boost_actual;
        if (numericData.boost_target !== undefined) mapped.boostTarget = numericData.boost_target;
        if (numericData.iat !== undefined) mapped.iat = numericData.iat;
        if (numericData.throttle_pos !== undefined) mapped.throttle = numericData.throttle_pos;
        if (numericData.load !== undefined) mapped.load = numericData.load;
        if (numericData.timing !== undefined) mapped.timing = numericData.timing;
        if (numericData.fuel_pressure !== undefined) mapped.fuelPressure = numericData.fuel_pressure;
        if (numericData.knock !== undefined) mapped.knock = numericData.knock;
        if (numericData.lambda !== undefined) mapped.lambda = numericData.lambda;
        if (numericData.map_pressure !== undefined) mapped.mapPressure = numericData.map_pressure;
        if (numericData.maf !== undefined) mapped.maf = numericData.maf;
        if (numericData.fuel_trim_short !== undefined) mapped.fuelTrimShort = numericData.fuel_trim_short;
        if (numericData.fuel_trim_long !== undefined) mapped.fuelTrimLong = numericData.fuel_trim_long;
        if (numericData.duty_cycle !== undefined) mapped.dutyCycle = numericData.duty_cycle;
        if (numericData.tq_actual !== undefined) mapped.tqActual = numericData.tq_actual;
        if (numericData.tq_requested !== undefined) mapped.tqRequested = numericData.tq_requested;
        if (numericData.turbine_inlet !== undefined) mapped.turbineInlet = numericData.turbine_inlet;
        if (numericData.turbine_outlet !== undefined) mapped.turbineOutlet = numericData.turbine_outlet;
        if (numericData.afr !== undefined) mapped.afr = numericData.afr;
        if (numericData.speed !== undefined) mapped.speed = numericData.speed;
        if (numericData.oil_pressure !== undefined) mapped.oilPressure = numericData.oil_pressure;

        if (mapped.rpm !== undefined) this.state.rpm = mapped.rpm;
        if (mapped.battery !== undefined) this.state.batteryVoltage = mapped.battery;
        if (mapped.speed !== undefined) this.state.vehicleSpeed = mapped.speed;

        this.emit();
        return mapped;
      }
      return null;
    } catch {
      return null;
    }
  }

  private startLiveDataPolling(intervalMs: number = 250) {
    this.stopLiveDataPolling();
    this.liveDataTimer = setInterval(() => {
      if (this.state.connectionState === 'connected') {
        this.readLiveData();
      }
    }, intervalMs);
  }

  private stopLiveDataPolling() {
    if (this.liveDataTimer) {
      clearInterval(this.liveDataTimer);
      this.liveDataTimer = null;
    }
  }

  async addBackupProgressListener(callback: (event: FlashProgressEvent) => void): Promise<() => void> {
    const handle = await OBD2Bridge.addListener('backupProgress', callback as any);
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

  async readDTCs(): Promise<{ readings: any[] }> {
    try {
      return await OBD2Bridge.readDTCs();
    } catch {
      return { readings: [] };
    }
  }

  async clearDTCs(ecuAddress?: string): Promise<{ success: boolean; cleared: number }> {
    try {
      return await OBD2Bridge.clearDTCs({ ecuAddress });
    } catch {
      return { success: false, cleared: 0 };
    }
  }

  enableWatchdog(timeoutMs: number = 2000, onDead: () => void) {
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
        this.disconnect();
      }
    }, 500);
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

  destroy() {
    this.stopWatchdog();
    this.stopLiveDataPolling();
    if (this.usbEventUnsub) this.usbEventUnsub();
    this.listeners = [];
    this.flashListeners = [];
  }
}

export const obd2Manager = new OBD2ConnectionManager();
export default obd2Manager;
