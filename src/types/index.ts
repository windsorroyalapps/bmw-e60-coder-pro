// BMW E60 Coder Pro - Complete Type Definitions

export type EngineType = 'n54' | 'n52' | 'm54' | 'm57';
export type FuelType = 'gasoline' | 'diesel';
export type AspirationType = 'naturally_aspirated' | 'single_turbo' | 'twin_turbo' | 'supercharged';
export type InjectorType = 'stock' | 'bosch_550' | 'bosch_650' | 'bosch_750' | 'bosch_850' | 'bosch_1000' | 'bosch_1200' | 'ev14_550' | 'ev14_650' | 'ev14_750' | 'ev14_850' | 'ev14_1000' | 'injector_dynamics_725' | 'injector_dynamics_850' | 'injector_dynamics_1000' | 'injector_dynamics_1300' | 'injector_dynamics_1700' | 'siemens_deka_60lb' | 'siemens_deka_80lb';
export type MapType = 'stock' | 'stage1' | 'stage2' | 'stage2plus' | 'stage3' | 'custom' | 'economy' | 'valet' | 'anti_theft';
export type DscMode = 'on' | 'dtc' | 'off';
export type TransmissionType = 'manual_6' | 'auto_6' | 'auto_6_sport' | 'smg_3';

export interface EngineSpecs {
  code: EngineType;
  name: string;
  fullName: string;
  displacement: number;      // liters
  cylinders: number;
  fuelType: FuelType;
  aspiration: AspirationType;
  stockPower: number;        // hp
  stockTorque: number;       // Nm
  stockBoost?: number;       // bar (for turbo engines)
  redline: number;           // RPM
  revLimit: number;          // RPM
  compressionRatio: number;
  bore: number;              // mm
  stroke: number;            // mm
  hasVanos: boolean;
  hasValvetronic: boolean;
  hasDirectInjection: boolean;
  ecuType: string;
  dmeFamily: string;
  supportedMaps: MapType[];
  maxSafeBoost?: number;     // bar
  maxSafePower: number;      // hp (hardware limit)
  injectorSizeCc: number;    // stock injector cc/min
  fuelPumpType: string;
  commonIssues: string[];
}

export interface InjectorSpec {
  id: InjectorType;
  name: string;
  brand: string;
  flowRateCc: number;        // cc/min at 3 bar
  flowRateLb: number;        // lb/hr
  impedance: 'high' | 'low';
  maxDutyCycle: number;      // 0-100%
  recommendedMaxHp: number;  // per cylinder
  pressureRating: number;    // bar
  compatible: EngineType[];
  latencyMs: number;         // opening latency in ms
  deadTimeMs: number;        // dead time at 14V
  requiresResistorDelete: boolean;
  notes: string;
}

export interface TimingTable {
  rpm: number;
  loadPercent: number;       // 0-100% engine load
  ignitionAdvance: number;   // degrees BTDC
  knockRetard: number;       // degrees removed due to knock
  optimal: number;           // AI-calculated optimal
  safe: number;              // conservative safe value
}

export interface FuelTable {
  rpm: number;
  loadPercent: number;
  lambdaTarget: number;      // target AFR as lambda
  fuelCorrection: number;    // % correction
  injectorPulseMs: number;
}

export interface BoostTable {
  rpm: number;
  targetBoost: number;       // bar
  wastegateDuty: number;     // 0-100%
  taperStartRpm: number;
  taperEndRpm: number;
  overboost: number;         // bar (temporary spike)
}

export interface ThrottleMap {
  pedalPercent: number;      // 0-100% pedal input
  throttlePercent: number;   // 0-100% actual throttle opening
  mode: 'linear' | 'aggressive' | 'custom' | 'valet';
}

export interface PerformanceMap {
  id: MapType;
  name: string;
  description: string;
  color: string;
  engine: EngineType;
  injector: InjectorType;
  timing: TimingTable[];
  fuel: FuelTable[];
  boost?: BoostTable[];
  throttle: ThrottleMap[];
  vanosIntake: { rpm: number; advance: number }[];
  vanosExhaust: { rpm: number; advance: number }[];
  valvetronicRange: { min: number; max: number };
  revLimit: number;
  launchControlRpm: number;
  warmStartEnrichment: number;
  fuelCutEnabled: boolean;
  softCutRpm?: number;
  hardCutRpm?: number;
  coolingFanSpeed: 'low' | 'high' | 'auto';
  speedLimit?: number;       // km/h, 0 = unlimited
  gearBasedBoost?: { gear: number; boost: number }[];
  aiGenerated: boolean;
  safetyScore: number;       // 0-100
}

export interface DmeFlashProtocol {
  protocolId: string;
  name: string;
  description: string;
  ecuTypes: string[];
  flashMethod: 'obd' | 'bench' | 'bdm';
  bootModePin?: number;
  voltageRequired: number;   // required battery voltage
  signatureRequired: boolean;
  checksumAlgorithm: 'crc16' | 'crc32' | 'bmw_custom';
  flashSectors: FlashSector[];
  safetyChecks: SafetyCheck[];
  recoveryProcedure: string[];
}

export interface FlashSector {
  name: string;
  startAddress: string;
  size: number;              // bytes
  isBootSector: boolean;
  writable: boolean;
  checksum: string;
}

export interface SafetyCheck {
  id: string;
  name: string;
  description: string;
  checkFunction: string;
  critical: boolean;
  autoFixable: boolean;
}

export interface GaugeLayout {
  id: string;
  name: string;
  gauges: GaugeConfig[];
  isDefault: boolean;
}

export interface GaugeConfig {
  id: string;
  type: 'rpm' | 'boost' | 'coolant_temp' | 'oil_temp' | 'oil_pressure' | 'afr' | 'iat' | 'speed' | 'throttle' | 'load' | 'timing' | 'fuel_pressure' | 'battery' | 'knock' | 'lambda' | 'map_pressure' | 'turbine_inlet' | 'turbine_outlet' | 'duty_cycle' | 'fuel_trim_short' | 'fuel_trim_long' | 'maf' | 'tq_actual' | 'tq_requested';
  position: { x: number; y: number; w: number; h: number };
  min: number;
  max: number;
  warningThreshold: number;
  dangerThreshold: number;
  unit: string;
  label: string;
}

export interface LiveData {
  rpm: number;
  speed: number;
  coolantTemp: number;
  oilTemp: number;
  oilPressure: number;
  boost: number;
  iat: number;
  afr: number;
  throttle: number;
  load: number;
  timing: number;
  fuelPressure: number;
  battery: number;
  knock: number;
  lambda: number;
  mapPressure: number;
  maf: number;
  fuelTrimShort: number;
  fuelTrimLong: number;
  dutyCycle: number;
  tqActual: number;
  tqRequested: number;
  turbineInlet: number;
  turbineOutlet: number;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  data: Partial<LiveData>;
  event?: string;
  severity?: 'info' | 'warning' | 'danger';
}

export interface LogSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  entries: LogEntry[];
  engineType: EngineType;
  mapType: MapType;
  maxRpm: number;
  maxBoost: number;
  maxSpeed: number;
  maxIat: number;
  knockEvents: number;
  avgAfr: number;
  aiRecommendations: string[];
}

export interface AiTuneRecommendation {
  id: string;
  type: 'timing' | 'fuel' | 'boost' | 'throttle' | 'vanos' | 'safety' | 'general';
  severity: 'info' | 'suggestion' | 'warning' | 'critical';
  message: string;
  parameter: string;
  currentValue: number;
  recommendedValue: number;
  reason: string;
  confidence: number;        // 0-100%
  autoApplicable: boolean;
}

export interface VehicleProfile {
  id: string;
  name: string;
  vin: string;
  engine: EngineType;
  transmission: TransmissionType;
  injector: InjectorType;
  hasUpgradedIntercooler: boolean;
  hasUpgradedTurbo: boolean;
  hasUpgradedFuelPump: boolean;
  hasUpgradedClutch: boolean;
  hasMethInjection: boolean;
  hasDownpipes: boolean;
  hasExhaust: boolean;
  hasUpgradedChargepipe: boolean;
  currentMap: MapType;
  mileage: number;
  notes: string;
}

export interface ConnectionStatus {
  connected: boolean;
  protocol: 'k_dcan' | 'enet' | 'none';
  ecuConnected: boolean;
  batteryVoltage: number;
  vehicleDetected: boolean;
  dmeDetected: boolean;
  egsDetected: boolean;
  dscDetected: boolean;
  kombiDetected: boolean;
  lastError?: string;
}
