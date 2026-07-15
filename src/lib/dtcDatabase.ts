// BMW E60 Coder Pro - DTC Code Database

export interface DTCInfo {
  code: string;
  description: string;
  system: string;
  severity: 'info' | 'warning' | 'critical';
}

export const DTC_DATABASE: Record<string, DTCInfo> = {
  'P0015': { code: 'P0015', description: 'VANOS exhaust camshaft position retard', system: 'VANOS', severity: 'warning' },
  'P0014': { code: 'P0014', description: 'VANOS exhaust camshaft position over-advanced', system: 'VANOS', severity: 'warning' },
  'P0012': { code: 'P0012', description: 'VANOS intake camshaft position retard', system: 'VANOS', severity: 'warning' },
  'P0011': { code: 'P0011', description: 'VANOS intake camshaft position over-advanced', system: 'VANOS', severity: 'warning' },
  'P0030': { code: 'P0030', description: 'O2 sensor heater control circuit', system: 'Fuel', severity: 'warning' },
  'P0031': { code: 'P0031', description: 'O2 sensor heater low input', system: 'Fuel', severity: 'warning' },
  'P0032': { code: 'P0032', description: 'O2 sensor heater high input', system: 'Fuel', severity: 'warning' },
  'P0101': { code: 'P0101', description: 'Mass Air Flow sensor range/performance', system: 'Intake', severity: 'critical' },
  'P0102': { code: 'P0102', description: 'Mass Air Flow sensor low input', system: 'Intake', severity: 'critical' },
  'P0103': { code: 'P0103', description: 'Mass Air Flow sensor high input', system: 'Intake', severity: 'critical' },
  'P0115': { code: 'P0115', description: 'Engine Coolant Temperature sensor circuit', system: 'Cooling', severity: 'critical' },
  'P0116': { code: 'P0116', description: 'Engine Coolant Temperature sensor range/performance', system: 'Cooling', severity: 'warning' },
  'P0128': { code: 'P0128', description: 'Coolant Thermostat below regulating temperature', system: 'Cooling', severity: 'info' },
  'P0171': { code: 'P0171', description: 'System too lean (Bank 1)', system: 'Fuel', severity: 'critical' },
  'P0172': { code: 'P0172', description: 'System too rich (Bank 1)', system: 'Fuel', severity: 'critical' },
  'P0174': { code: 'P0174', description: 'System too lean (Bank 2)', system: 'Fuel', severity: 'critical' },
  'P0175': { code: 'P0175', description: 'System too rich (Bank 2)', system: 'Fuel', severity: 'critical' },
  'P0234': { code: 'P0234', description: 'Turbocharger overboost condition', system: 'Boost', severity: 'critical' },
  'P0243': { code: 'P0243', description: 'Wastegate solenoid A malfunction', system: 'Boost', severity: 'warning' },
  'P0245': { code: 'P0245', description: 'Wastegate solenoid A low', system: 'Boost', severity: 'warning' },
  'P0246': { code: 'P0246', description: 'Wastegate solenoid A high', system: 'Boost', severity: 'warning' },
  'P0299': { code: 'P0299', description: 'Turbocharger underboost', system: 'Boost', severity: 'critical' },
  'P0300': { code: 'P0300', description: 'Random/multiple cylinder misfire', system: 'Ignition', severity: 'critical' },
  'P0301': { code: 'P0301', description: 'Cylinder 1 misfire', system: 'Ignition', severity: 'critical' },
  'P0302': { code: 'P0302', description: 'Cylinder 2 misfire', system: 'Ignition', severity: 'critical' },
  'P0303': { code: 'P0303', description: 'Cylinder 3 misfire', system: 'Ignition', severity: 'critical' },
  'P0304': { code: 'P0304', description: 'Cylinder 4 misfire', system: 'Ignition', severity: 'critical' },
  'P0305': { code: 'P0305', description: 'Cylinder 5 misfire', system: 'Ignition', severity: 'critical' },
  'P0306': { code: 'P0306', description: 'Cylinder 6 misfire', system: 'Ignition', severity: 'critical' },
  'P0325': { code: 'P0325', description: 'Knock sensor circuit malfunction', system: 'Ignition', severity: 'warning' },
  'P0327': { code: 'P0327', description: 'Knock sensor low input', system: 'Ignition', severity: 'warning' },
  'P0335': { code: 'P0335', description: 'Crankshaft position sensor circuit', system: 'Sensors', severity: 'critical' },
  'P0340': { code: 'P0340', description: 'Camshaft position sensor circuit', system: 'Sensors', severity: 'critical' },
  'P0344': { code: 'P0344', description: 'Camshaft position sensor intermittent', system: 'Sensors', severity: 'warning' },
  'P0441': { code: 'P0441', description: 'Evaporative emission system incorrect purge flow', system: 'Emissions', severity: 'info' },
  'P0455': { code: 'P0455', description: 'Evaporative emission system leak (large)', system: 'Emissions', severity: 'info' },
  'P0491': { code: 'P0491', description: 'Secondary air injection system insufficient flow', system: 'Emissions', severity: 'info' },
  'P0500': { code: 'P0500', description: 'Vehicle speed sensor malfunction', system: 'Drivetrain', severity: 'warning' },
  'P0562': { code: 'P0562', description: 'System voltage low', system: 'Electrical', severity: 'warning' },
  'P0563': { code: 'P0563', description: 'System voltage high', system: 'Electrical', severity: 'warning' },
  'P0601': { code: 'P0601', description: 'Internal Control Module memory checksum error', system: 'DME', severity: 'critical' },
  'P0602': { code: 'P0602', description: 'Control Module programming error', system: 'DME', severity: 'critical' },
  'P0603': { code: 'P0603', description: 'Internal Control Module keep alive memory error', system: 'DME', severity: 'critical' },
  'P0604': { code: 'P0604', description: 'Internal Control Module RAM error', system: 'DME', severity: 'critical' },
  'P0605': { code: 'P0605', description: 'Internal Control Module ROM error', system: 'DME', severity: 'critical' },
  'P0638': { code: 'P0638', description: 'Throttle actuator control range/performance', system: 'Throttle', severity: 'critical' },
  'P0642': { code: 'P0642', description: 'Sensor reference voltage A circuit low', system: 'Electrical', severity: 'warning' },
  'P0700': { code: 'P0700', description: 'Transmission control system malfunction', system: 'Transmission', severity: 'critical' },
  'P112F': { code: 'P112F', description: 'Manifold absolute pressure sensor performance', system: 'Boost', severity: 'warning' },
  'P12B9': { code: 'P12B9', description: 'Fuel pressure sensor low input', system: 'Fuel', severity: 'critical' },
  'P12BA': { code: 'P12BA', description: 'Fuel pressure sensor high input', system: 'Fuel', severity: 'critical' },
  'P1621': { code: 'P1621', description: 'Immobilizer / EWS communication', system: 'Security', severity: 'critical' },
  'P1632': { code: 'P1632', description: 'EWS key not recognized', system: 'Security', severity: 'critical' },
  'P2187': { code: 'P2187', description: 'System too lean at idle (Bank 1)', system: 'Fuel', severity: 'warning' },
  'P2188': { code: 'P2188', description: 'System too rich at idle (Bank 1)', system: 'Fuel', severity: 'warning' },
  'P2BAC': { code: 'P2BAC', description: 'NOx sensor performance', system: 'Emissions', severity: 'info' },
  'P30FF': { code: 'P30FF', description: 'Turbocharger boost pressure control deactivation', system: 'Boost', severity: 'warning' },
  'P3100': { code: 'P3100', description: 'Boost pressure control position sensor', system: 'Boost', severity: 'warning' },
  'P3101': { code: 'P3101', description: 'Boost pressure control default position not reached', system: 'Boost', severity: 'warning' },
  'P3102': { code: 'P3102', description: 'Boost pressure control end position not reached', system: 'Boost', severity: 'warning' },
  'P3103': { code: 'P3103', description: 'Boost pressure control deactivation', system: 'Boost', severity: 'warning' },
  'P323A': { code: 'P323A', description: 'Charge air cooler efficiency below threshold', system: 'Boost', severity: 'info' },
};

export function getDTCInfo(code: string): DTCInfo | undefined {
  return DTC_DATABASE[code];
}

export function searchDTCs(query: string): DTCInfo[] {
  const q = query.toUpperCase();
  return Object.values(DTC_DATABASE).filter(
    d => d.code.includes(q) || d.description.toUpperCase().includes(q) || d.system.toUpperCase().includes(q)
  );
}

export default DTC_DATABASE;
