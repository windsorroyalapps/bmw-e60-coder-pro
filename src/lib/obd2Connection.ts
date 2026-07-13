// BMW E60 Coder Pro - OBD2/K+DCAN Connection Manager
// Manages USB serial connection state, cable detection, and ECU communication

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

export interface ECUDetected {
  name: string;
  address: string;
  protocol: string;
  status: 'online' | 'offline' | 'faulty';
  firmwareVersion?: string;
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

export interface FlashSession {
  id: string;
  startTime: number;
  status: 'preparing' | 'flashing' | 'verifying' | 'complete' | 'error' | 'aborted';
  progress: number; // 0-100
  currentSector: string;
  sectorsTotal: number;
  sectorsComplete: number;
  bytesWritten: number;
  bytesTotal: number;
  speed: number; // KB/s
  eta: number; // seconds
  errors: string[];
  isLiveFlash: boolean;
  vehicleSpeed: number;
  batteryVoltage: number;
}

export interface OBD2State {
  connectionState: ConnectionState;
  cable: CableInfo | null;
  protocol: ProtocolType;
  ecus: ECUDetected[];
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

const DEFAULT_CABLES: CableInfo[] = [
  {
    type: 'k_dcan_ftdi',
    vendorId: '0x0403',
    productId: '0x6001',
    serialNumber: 'FT123456',
    driverVersion: '2.12.28',
    baudRate: 115200,
    isGenuine: true,
    detectedChip: 'FTDI_FT232R',
  },
  {
    type: 'k_dcan_ch340',
    vendorId: '0x1A86',
    productId: '0x7523',
    serialNumber: 'CH340-001',
    driverVersion: '3.5.2019.1',
    baudRate: 38400,
    isGenuine: false,
    detectedChip: 'CH340',
  },
  {
    type: 'enet',
    vendorId: '0x0B95',
    productId: '0x1790',
    serialNumber: 'ENET-001',
    driverVersion: '1.0.0',
    baudRate: 1000000,
    isGenuine: true,
    detectedChip: 'CP2102',
  },
];

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
  private flashSession: FlashSession | null = null;
  private flashListeners: ((session: FlashSession) => void)[] = [];

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

  /**
   * Simulate cable detection - scans USB devices
   */
  async detectCable(): Promise<CableInfo | null> {
    this.updateState({ connectionState: 'searching' });

    // Simulate USB scan delay
    await this.delay(800);

    // Randomly detect a cable (in real app, this scans actual USB devices)
    const detected = Math.random() > 0.1 ? DEFAULT_CABLES[Math.floor(Math.random() * DEFAULT_CABLES.length)] : null;

    if (detected) {
      this.updateState({
        cable: detected,
        lastError: null,
      });
      return detected;
    } else {
      this.updateState({
        connectionState: 'error',
        lastError: 'No K+DCAN cable detected. Check USB OTG connection.',
      });
      return null;
    }
  }

  /**
   * Connect to vehicle via detected cable
   */
  async connect(): Promise<boolean> {
    if (!this.state.cable) {
      const cable = await this.detectCable();
      if (!cable) return false;
    }

    this.updateState({ connectionState: 'connecting' });

    const diag: ConnectionDiagnostics = {
      cableDetectTime: 0,
      protocolNegotiateTime: 0,
      ecuScanTime: 0,
      totalConnectTime: Date.now(),
      retries: 0,
      errors: [],
    };

    // Step 1: Open serial port
    await this.delay(500);
    diag.cableDetectTime = Date.now() - diag.totalConnectTime;

    // Step 2: Protocol negotiation
    this.updateState({ connectionState: 'handshaking' });
    await this.delay(800);
    diag.protocolNegotiateTime = Date.now() - diag.totalConnectTime - diag.cableDetectTime;

    const protocol = this.state.cable!.type === 'enet' ? 'enet' : 'k_dcan';

    // Step 3: ECU scan
    await this.delay(600);
    diag.ecuScanTime = Date.now() - diag.totalConnectTime - diag.cableDetectTime - diag.protocolNegotiateTime;
    diag.totalConnectTime = Date.now() - diag.totalConnectTime;

    // Build ECU list
    const ecus: ECUDetected[] = [
      { name: 'DME (Engine)', address: '0x12', protocol: 'UDS', status: 'online', firmwareVersion: 'MSD81.3', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'EGS (Transmission)', address: '0x18', protocol: 'UDS', status: 'online', firmwareVersion: 'EGS53', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'DSC (Stability)', address: '0x19', protocol: 'UDS', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'KOMBI (Cluster)', address: '0x60', protocol: 'KWP', status: 'online', lastResponse: Date.now(), faultCodes: 1 },
      { name: 'CAS (Access)', address: '0x00', protocol: 'KWP', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'FRM (Footwell)', address: '0x40', protocol: 'UDS', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'SZL (Steering)', address: '0x50', protocol: 'KWP', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'CCC (iDrive)', address: '0x63', protocol: 'KWP', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
      { name: 'ABG (Airbag)', address: '0x58', protocol: 'UDS', status: 'online', lastResponse: Date.now(), faultCodes: 0 },
    ];

    this.updateState({
      connectionState: 'connected',
      protocol: protocol as ProtocolType,
      ecus,
      batteryVoltage: 14.2,
      ignitionState: 'on',
      engineRunning: true,
      diagnostics: diag,
      lastError: null,
      lastActivity: Date.now(),
      dmeProtocolVersion: 'UDS/BMW-FAST',
    });

    return true;
  }

  /**
   * Disconnect from vehicle
   */
  disconnect(): void {
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
  }

  /**
   * Initiate a flash session with safety checks
   */
  async startFlash(isLiveFlash: boolean = false): Promise<{ success: boolean; message: string; session?: FlashSession }> {
    // Safety checks
    if (this.state.connectionState !== 'connected') {
      return { success: false, message: 'Not connected to vehicle' };
    }

    if (this.state.batteryVoltage < 13.0) {
      return { success: false, message: `Battery voltage too low: ${this.state.batteryVoltage.toFixed(1)}V (need 13.0V+)` };
    }

    if (this.state.ignitionState !== 'on') {
      return { success: false, message: 'Ignition must be ON (KL15)' };
    }

    if (isLiveFlash && this.state.vehicleSpeed > 5) {
      return { success: false, message: 'Live flash requires vehicle speed < 5 km/h' };
    }

    const dme = this.state.ecus.find(e => e.address === '0x12');
    if (!dme || dme.status !== 'online') {
      return { success: false, message: 'DME not responding' };
    }

    const session: FlashSession = {
      id: `flash_${Date.now()}`,
      startTime: Date.now(),
      status: 'preparing',
      progress: 0,
      currentSector: 'Preparing...',
      sectorsTotal: 4,
      sectorsComplete: 0,
      bytesWritten: 0,
      bytesTotal: 2228224, // ~2.1MB typical
      speed: 0,
      eta: 120,
      errors: [],
      isLiveFlash,
      vehicleSpeed: this.state.vehicleSpeed,
      batteryVoltage: this.state.batteryVoltage,
    };

    this.flashSession = session;
    this.emitFlash();

    return { success: true, message: 'Flash session started', session };
  }

  /**
   * Execute the flash sequence (simulated)
   */
  async executeFlash(): Promise<void> {
    if (!this.flashSession) return;

    const sectors = ['Boot Sector', 'Program Flash', 'Data Flash', 'EEPROM'];
    const sectorSizes = [32768, 2097152, 524288, 65536];

    // Start flashing
    this.flashSession.status = 'flashing';
    this.flashSession.currentSector = sectors[0];
    this.emitFlash();

    for (let i = 0; i < sectors.length; i++) {
      this.flashSession.currentSector = sectors[i];
      this.flashSession.sectorsComplete = i;
      this.emitFlash();

      // Simulate sector write with progress updates
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        await this.delay(200);
        this.flashSession.bytesWritten += sectorSizes[i] / steps;
        this.flashSession.progress = Math.round((this.flashSession.bytesWritten / this.flashSession.bytesTotal) * 100);
        this.flashSession.speed = 15 + Math.random() * 10;
        this.flashSession.eta = Math.round((this.flashSession.bytesTotal - this.flashSession.bytesWritten) / (this.flashSession.speed * 1024));
        this.emitFlash();
      }
    }

    // Verification
    this.flashSession.status = 'verifying';
    this.flashSession.currentSector = 'Verifying checksums...';
    this.emitFlash();
    await this.delay(2000);

    this.flashSession.status = 'complete';
    this.flashSession.progress = 100;
    this.flashSession.sectorsComplete = sectors.length;
    this.flashSession.currentSector = 'Flash complete!';
    this.flashSession.eta = 0;
    this.emitFlash();
  }

  /**
   * Quick map flash - writes only tune parameters (not full flash)
   */
  async quickFlash(): Promise<{ success: boolean; message: string }> {
    if (this.state.connectionState !== 'connected') {
      return { success: false, message: 'Not connected' };
    }

    if (this.state.vehicleSpeed > 80) {
      return { success: false, message: 'Speed too high for quick flash (>80 km/h)' };
    }

    // Quick flash is safer - only writes calibration data
    await this.delay(1500);
    return { success: true, message: 'Quick tune flash complete' };
  }

  /**
   * Abort current flash
   */
  abortFlash(): void {
    if (this.flashSession) {
      this.flashSession.status = 'aborted';
      this.flashSession.currentSector = 'Flash aborted by user';
      this.emitFlash();
    }
  }

  /**
   * Read DME info
   */
  async readDMEInfo(): Promise<{ ecuType: string; software: string; vin: string; powerClass: string } | null> {
    if (this.state.connectionState !== 'connected') return null;
    await this.delay(300);
    return {
      ecuType: 'MSD81',
      software: '0049QK0M50S',
      vin: 'WBANV93559B562821',
      powerClass: '306hp',
    };
  }

  /**
   * Update live vehicle data
   */
  updateLiveData(data: { rpm?: number; speed?: number; batteryVoltage?: number }): void {
    this.updateState({
      rpm: data.rpm ?? this.state.rpm,
      vehicleSpeed: data.speed ?? this.state.vehicleSpeed,
      batteryVoltage: data.batteryVoltage ?? this.state.batteryVoltage,
      lastActivity: Date.now(),
    });
  }

  private updateState(partial: Partial<OBD2State>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const obd2Manager = new OBD2ConnectionManager();
