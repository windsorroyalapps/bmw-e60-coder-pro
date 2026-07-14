// BMW E60 Coder Pro - DTC (Diagnostic Trouble Code) Database
// Comprehensive P-code descriptions for BMW E60 N54/N52 engines

export interface DTCCode {
  code: string;
  description: string;
  system: 'engine' | 'transmission' | 'abs' | 'airbag' | 'hvac' | 'electrical' | 'fuel' | 'ignition' | 'emissions' | 'generic';
  severity: 'info' | 'minor' | 'moderate' | 'severe' | 'critical';
  possibleCauses: string[];
  bmwSpecificNotes?: string;
}

const DTC_DATABASE: Record<string, DTCCode> = {
  // ==================== P0000 - P0099: Fuel and Air Metering ====================
  'P0001': { code: 'P0001', description: 'Fuel Volume Regulator Control Circuit/Open', system: 'fuel', severity: 'moderate', possibleCauses: ['Faulty fuel volume regulator', 'Open in control circuit', 'ECM failure'], bmwSpecificNotes: 'Check DME output stage' },
  'P0002': { code: 'P0002', description: 'Fuel Volume Regulator Control Circuit Range/Performance', system: 'fuel', severity: 'moderate', possibleCauses: ['Fuel pressure sensor fault', 'Regulator stuck', 'Fuel pump wear'], bmwSpecificNotes: 'Common on high-mileage N54 with LPFP wear' },
  'P0010': { code: 'P0010', description: 'A Camshaft Position Actuator Circuit (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failure', 'Wiring harness damage', 'Oil contamination in solenoid'], bmwSpecificNotes: 'N54: Check exhaust Vanos solenoid first. Clean with brake cleaner before replacing.' },
  'P0011': { code: 'P0011', description: 'A Camshaft Position - Timing Over-Advanced or System Performance (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid stuck', 'Timing chain stretch', 'Low oil pressure', 'Worn timing chain tensioner'], bmwSpecificNotes: 'N54 at 80k+ miles: likely timing chain stretch. Check chain guide condition.' },
  'P0012': { code: 'P0012', description: 'A Camshaft Position - Timing Over-Retarded (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid stuck open', 'Low engine oil', 'Clogged oil passages', 'Timing chain jumped'], bmwSpecificNotes: 'Check oil level first - N54 is sensitive to oil level for Vanos operation' },
  'P0015': { code: 'P0015', description: 'B Camshaft Position - Timing Over-Retarded (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Exhaust Vanos solenoid fault', 'Timing chain stretch', 'Oil quality degradation'], bmwSpecificNotes: 'N54 exhaust Vanos more prone to failure than intake' },
  'P0016': { code: 'P0016', description: 'Crankshaft Position - Camshaft Position Correlation (Bank 1 Sensor A)', system: 'engine', severity: 'critical', possibleCauses: ['Timing chain jumped tooth', 'Failed timing chain tensioner', 'Worn chain guides', 'Crank/cam sensor misalignment'], bmwSpecificNotes: 'STOP DRIVING. N54 timing chain failure can cause catastrophic engine damage. Inspect chain immediately.' },
  'P0020': { code: 'P0020', description: 'A Camshaft Position Actuator Circuit (Bank 2)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failure', 'Wiring damage', 'Poor electrical connection'], bmwSpecificNotes: 'N54: Bank 2 is cylinders 4-6, check intake Vanos solenoid' },
  'P0021': { code: 'P0021', description: 'A Camshaft Position - Timing Over-Advanced or System Performance (Bank 2)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid stuck', 'Timing chain stretch', 'Low oil pressure'], bmwSpecificNotes: 'Check oil pressure with mechanical gauge' },
  'P0024': { code: 'P0024', description: 'B Camshaft Position - Timing Over-Advanced or System Performance (Bank 2)', system: 'engine', severity: 'severe', possibleCauses: ['Exhaust Vanos solenoid stuck', 'Timing chain stretch'], bmwSpecificNotes: '' },
  'P0030': { code: 'P0030', description: 'HO2S Heater Control Circuit (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor heater failure', 'Wiring open/short', 'Fuse blown'], bmwSpecificNotes: 'N54 pre-cat O2 sensor - very common failure at 60k+ miles' },
  'P0031': { code: 'P0031', description: 'HO2S Heater Control Circuit Low (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['Short to ground in heater circuit', 'Failed O2 sensor heater'], bmwSpecificNotes: '' },
  'P0032': { code: 'P0032', description: 'HO2S Heater Control Circuit High (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['Short to power in heater circuit', 'Failed O2 sensor'], bmwSpecificNotes: '' },
  'P0036': { code: 'P0036', description: 'HO2S Heater Control Circuit (Bank 1 Sensor 2)', system: 'emissions', severity: 'moderate', possibleCauses: ['Post-cat O2 sensor heater failure', 'Wiring issue'], bmwSpecificNotes: 'Post-cat O2 less critical for engine operation' },
  'P0050': { code: 'P0050', description: 'HO2S Heater Control Circuit (Bank 2 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor heater failure', 'Wiring open/short'], bmwSpecificNotes: 'N54 Bank 2 pre-cat O2 sensor' },
  'P0056': { code: 'P0056', description: 'HO2S Heater Control Circuit (Bank 2 Sensor 2)', system: 'emissions', severity: 'moderate', possibleCauses: ['Post-cat O2 sensor heater failure'], bmwSpecificNotes: '' },

  // ==================== P0100 - P0199: Air/Fuel Injection ====================
  'P0100': { code: 'P0100', description: 'Mass or Volume Air Flow Circuit', system: 'engine', severity: 'severe', possibleCauses: ['MAF sensor failure', 'Wiring issue', 'Air leak after MAF'], bmwSpecificNotes: '' },
  'P0101': { code: 'P0101', description: 'Mass or Volume Air Flow Circuit Range/Performance', system: 'engine', severity: 'severe', possibleCauses: ['Dirty/failing MAF sensor', 'Intake air leak', 'Clogged air filter', 'PCV valve failure'], bmwSpecificNotes: 'N54: Clean MAF with CRC MAF cleaner first. Check for torn intake boot.' },
  'P0102': { code: 'P0102', description: 'Mass or Volume Air Flow Circuit Low Input', system: 'engine', severity: 'severe', possibleCauses: ['MAF sensor disconnected', 'Short to ground', 'Failed MAF sensor'], bmwSpecificNotes: 'Check MAF connector - common for wire chafing on N54' },
  'P0103': { code: 'P0103', description: 'Mass or Volume Air Flow Circuit High Input', system: 'engine', severity: 'severe', possibleCauses: ['Short to power', 'MAF sensor failure', 'ECM issue'], bmwSpecificNotes: '' },
  'P0110': { code: 'P0110', description: 'Intake Air Temperature Sensor Circuit', system: 'engine', severity: 'minor', possibleCauses: ['IAT sensor failure', 'Wiring issue'], bmwSpecificNotes: 'N54 IAT integrated in MAF sensor' },
  'P0115': { code: 'P0115', description: 'Engine Coolant Temperature Circuit', system: 'engine', severity: 'moderate', possibleCauses: ['ECT sensor failure', 'Wiring issue', 'Thermostat stuck open'], bmwSpecificNotes: '' },
  'P0116': { code: 'P0116', description: 'Engine Coolant Temperature Circuit Range/Performance', system: 'engine', severity: 'moderate', possibleCauses: ['Thermostat stuck open', 'ECT sensor drifting', 'Coolant air pocket'], bmwSpecificNotes: 'N54: Common for thermostat to fail open. Replace with 88C Wahler thermostat.' },
  'P0120': { code: 'P0120', description: 'Throttle/Pedal Position Sensor/Switch A Circuit', system: 'engine', severity: 'critical', possibleCauses: ['Throttle body sensor failure', 'Wiring issue', 'Poor connection'], bmwSpecificNotes: 'N54: May enter limp mode. Try throttle body adaptation reset first.' },
  'P0121': { code: 'P0121', description: 'Throttle/Pedal Position Sensor/Switch A Circuit Range/Performance', system: 'engine', severity: 'critical', possibleCauses: ['Worn throttle position sensor', 'Carbon buildup in throttle body'], bmwSpecificNotes: 'Clean throttle body before replacing sensor' },
  'P0128': { code: 'P0128', description: 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)', system: 'engine', severity: 'moderate', possibleCauses: ['Thermostat stuck open', 'Low coolant', 'Faulty ECT sensor'], bmwSpecificNotes: 'N54 extremely common. Replace thermostat with 88C unit. Will reduce fuel economy until fixed.' },
  'P0130': { code: 'P0130', description: 'O2 Sensor Circuit (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failure', 'Wiring issue', 'Exhaust leak'], bmwSpecificNotes: 'N54 pre-cat O2 - affects fuel trim' },
  'P0131': { code: 'P0131', description: 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failure', 'Short to ground', 'Lean condition'], bmwSpecificNotes: '' },
  'P0132': { code: 'P0132', description: 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failure', 'Rich condition', 'Short to power'], bmwSpecificNotes: '' },
  'P0133': { code: 'P0133', description: 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['Aged O2 sensor', 'Exhaust leak', 'Fuel quality'], bmwSpecificNotes: 'N54 O2 sensors typically last 60-80k miles' },
  'P0135': { code: 'P0135', description: 'O2 Sensor Heater Circuit (Bank 1 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor heater failure', 'Wiring issue'], bmwSpecificNotes: '' },
  'P0140': { code: 'P0140', description: 'O2 Sensor Circuit No Activity Detected (Bank 1 Sensor 2)', system: 'emissions', severity: 'minor', possibleCauses: ['Post-cat O2 sensor failure', 'Wiring issue'], bmwSpecificNotes: 'Post-cat O2 does not affect fuel trim significantly' },
  'P0141': { code: 'P0141', description: 'O2 Sensor Heater Circuit (Bank 1 Sensor 2)', system: 'emissions', severity: 'minor', possibleCauses: ['Post-cat O2 heater failure'], bmwSpecificNotes: '' },
  'P0150': { code: 'P0150', description: 'O2 Sensor Circuit (Bank 2 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failure', 'Wiring issue'], bmwSpecificNotes: 'N54 Bank 2 pre-cat O2' },
  'P0153': { code: 'P0153', description: 'O2 Sensor Circuit Slow Response (Bank 2 Sensor 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['Aged O2 sensor', 'Exhaust leak'], bmwSpecificNotes: '' },
  'P0171': { code: 'P0171', description: 'System Too Lean (Bank 1)', system: 'fuel', severity: 'severe', possibleCauses: ['Intake air leak after MAF', 'Failing fuel pump', 'Clogged fuel injectors', 'Vacuum leak', 'PCV valve failure', 'Exhaust leak before O2'], bmwSpecificNotes: 'N54: #1 cause is valve cover/PCV leak. Check oil cap seal and valve cover gasket. Check LPFP pressure under load.' },
  'P0172': { code: 'P0172', description: 'System Too Rich (Bank 1)', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking fuel injector', 'High fuel pressure', 'MAF sensor under-reading', 'Faulty O2 sensor'], bmwSpecificNotes: 'N54: Check for leaking injector (smell fuel at idle). Check HPFP operation.' },
  'P0174': { code: 'P0174', description: 'System Too Lean (Bank 2)', system: 'fuel', severity: 'severe', possibleCauses: ['Intake air leak', 'Fuel delivery issue', 'Vacuum leak'], bmwSpecificNotes: 'N54: Check charge pipe connections, intercooler boots' },
  'P0175': { code: 'P0175', description: 'System Too Rich (Bank 2)', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking injector', 'High fuel pressure', 'MAF under-reading'], bmwSpecificNotes: '' },
  'P0180': { code: 'P0180', description: 'Fuel Temperature Sensor A Circuit', system: 'fuel', severity: 'minor', possibleCauses: ['Fuel temp sensor failure', 'Wiring issue'], bmwSpecificNotes: '' },
  'P0190': { code: 'P0190', description: 'Fuel Rail Pressure Sensor Circuit', system: 'fuel', severity: 'severe', possibleCauses: ['HPFP sensor failure', 'Wiring issue', 'ECM failure'], bmwSpecificNotes: 'N54: HPFP sensor critical for direct injection operation' },
  'P0191': { code: 'P0191', description: 'Fuel Rail Pressure Sensor Circuit Range/Performance', system: 'fuel', severity: 'severe', possibleCauses: ['HPFP sensor drifting', 'Actual fuel pressure issue', 'Wiring resistance'], bmwSpecificNotes: 'N54: If HPFP failing, actual pressure will not match requested' },
  'P0192': { code: 'P0192', description: 'Fuel Rail Pressure Sensor Circuit Low Input', system: 'fuel', severity: 'severe', possibleCauses: ['Sensor short to ground', 'Wiring issue'], bmwSpecificNotes: '' },
  'P0193': { code: 'P0193', description: 'Fuel Rail Pressure Sensor Circuit High Input', system: 'fuel', severity: 'severe', possibleCauses: ['Sensor short to power', 'Open ground circuit'], bmwSpecificNotes: '' },

  // ==================== P0200 - P0299: Fuel Injectors / Turbo ====================
  'P0201': { code: 'P0201', description: 'Injector Circuit/Open - Cylinder 1', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM injector driver failure'], bmwSpecificNotes: 'N54: Check injector connector pin 1 and 2 for continuity' },
  'P0202': { code: 'P0202', description: 'Injector Circuit/Open - Cylinder 2', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM driver failure'], bmwSpecificNotes: '' },
  'P0203': { code: 'P0203', description: 'Injector Circuit/Open - Cylinder 3', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM driver failure'], bmwSpecificNotes: '' },
  'P0204': { code: 'P0204', description: 'Injector Circuit/Open - Cylinder 4', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM driver failure'], bmwSpecificNotes: '' },
  'P0205': { code: 'P0205', description: 'Injector Circuit/Open - Cylinder 5', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM driver failure'], bmwSpecificNotes: '' },
  'P0206': { code: 'P0206', description: 'Injector Circuit/Open - Cylinder 6', system: 'fuel', severity: 'critical', possibleCauses: ['Injector coil open', 'Wiring break', 'ECM driver failure'], bmwSpecificNotes: '' },
  'P0217': { code: 'P0217', description: 'Engine Overheat Condition', system: 'engine', severity: 'critical', possibleCauses: ['Coolant leak', 'Failed water pump', 'Failed thermostat', 'Clogged radiator', 'Failed cooling fan'], bmwSpecificNotes: 'N54: Electric water pump common failure point. Check pump operation via ISTA.' },
  'P0219': { code: 'P0219', description: 'Engine Overspeed Condition', system: 'engine', severity: 'critical', possibleCauses: ['Mechanical throttle stick', 'ECM failure', 'Missed downshift'], bmwSpecificNotes: 'N54: Over-rev can cause valve float and piston damage' },
  'P0220': { code: 'P0220', description: 'Throttle/Pedal Position Sensor/Switch B Circuit', system: 'engine', severity: 'critical', possibleCauses: ['APP sensor failure', 'Wiring issue'], bmwSpecificNotes: 'N54: Accelerator pedal has dual redundant sensors' },
  'P0230': { code: 'P0230', description: 'Fuel Pump Primary Circuit', system: 'fuel', severity: 'severe', possibleCauses: ['LPFP relay failure', 'Wiring issue', 'Fuel pump module failure'], bmwSpecificNotes: 'N54: Check EKP module (fuel pump control module) under rear seat' },
  'P0234': { code: 'P0234', description: 'Turbocharger/Supercharger Overboost Condition', system: 'engine', severity: 'severe', possibleCauses: ['Wastegate actuator stuck closed', 'Wastegate solenoid failure', 'Boost control vacuum leak', 'Charge pipe leak causing false reading'], bmwSpecificNotes: 'N54: Very common. Check wastegate rattle (actuator rod play). Check boost solenoids (blue and black). Check for charge pipe leaks.' },
  'P0243': { code: 'P0243', description: 'Turbocharger Wastegate Solenoid A Malfunction', system: 'engine', severity: 'severe', possibleCauses: ['Wastegate solenoid failure', 'Vacuum line leak', 'Electrical fault'], bmwSpecificNotes: 'N54: Two boost solenoids - check both and vacuum lines to them' },
  'P0244': { code: 'P0244', description: 'Turbocharger Wastegate Solenoid A Range/Performance', system: 'engine', severity: 'severe', possibleCauses: ['Solenoid sticking', 'Weak vacuum supply', 'Wastegate actuator mechanical issue'], bmwSpecificNotes: 'N54: Clean or replace boost solenoids' },
  'P0245': { code: 'P0245', description: 'Turbocharger Wastegate Solenoid A Low', system: 'engine', severity: 'severe', possibleCauses: ['Short to ground', 'Solenoid coil failure'], bmwSpecificNotes: '' },
  'P025A': { code: 'P025A', description: 'Fuel Pump Module Control Circuit', system: 'fuel', severity: 'severe', possibleCauses: ['EKP module failure', 'Wiring issue', 'Fuel pump drawing too much current'], bmwSpecificNotes: 'N54: EKP module commonly fails. Can cause lean codes and HPFP damage.' },
  'P0261': { code: 'P0261', description: 'Cylinder 1 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground', 'Injector coil shorted'], bmwSpecificNotes: '' },
  'P0262': { code: 'P0262', description: 'Cylinder 1 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power', 'Open ground'], bmwSpecificNotes: '' },
  'P0263': { code: 'P0263', description: 'Cylinder 1 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition coil failure', 'Spark plug fouled'], bmwSpecificNotes: 'N54: Run cylinder balance test via ISTA. Swap coils/plugs to isolate.' },
  'P0264': { code: 'P0264', description: 'Cylinder 2 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground'], bmwSpecificNotes: '' },
  'P0265': { code: 'P0265', description: 'Cylinder 2 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P0266': { code: 'P0266', description: 'Cylinder 2 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition issue'], bmwSpecificNotes: '' },
  'P0267': { code: 'P0267', description: 'Cylinder 3 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground'], bmwSpecificNotes: '' },
  'P0268': { code: 'P0268', description: 'Cylinder 3 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P0269': { code: 'P0269', description: 'Cylinder 3 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition issue'], bmwSpecificNotes: '' },
  'P0270': { code: 'P0270', description: 'Cylinder 4 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground'], bmwSpecificNotes: '' },
  'P0271': { code: 'P0271', description: 'Cylinder 4 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P0272': { code: 'P0272', description: 'Cylinder 4 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition issue'], bmwSpecificNotes: '' },
  'P0273': { code: 'P0273', description: 'Cylinder 5 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground'], bmwSpecificNotes: '' },
  'P0274': { code: 'P0274', description: 'Cylinder 5 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P0275': { code: 'P0275', description: 'Cylinder 5 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition issue'], bmwSpecificNotes: '' },
  'P0276': { code: 'P0276', description: 'Cylinder 6 Injector Circuit Low', system: 'fuel', severity: 'critical', possibleCauses: ['Short to ground'], bmwSpecificNotes: '' },
  'P0277': { code: 'P0277', description: 'Cylinder 6 Injector Circuit High', system: 'fuel', severity: 'critical', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P0278': { code: 'P0278', description: 'Cylinder 6 Contribution/Balance Fault', system: 'engine', severity: 'severe', possibleCauses: ['Weak injector', 'Low compression', 'Ignition issue'], bmwSpecificNotes: '' },
  'P0299': { code: 'P0299', description: 'Turbocharger/Supercharger Underboost Condition', system: 'engine', severity: 'severe', possibleCauses: ['Wastegate actuator stuck open', 'Charge pipe leak', 'Boost solenoid failure', 'Turbocharger wastegate flap damaged', 'Vacuum leak to wastegate actuators', 'Failing turbocharger'], bmwSpecificNotes: 'N54 #1 turbo code. Check charge pipe connections first (easy). Then check wastegate rattle. Then test boost solenoids. Failing turbos will require replacement or rebuild.' },

  // ==================== P0300 - P0399: Ignition / Misfire ====================
  'P0300': { code: 'P0300', description: 'Random/Multiple Cylinder Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug failure', 'Ignition coil failure', 'Injector issue', 'Low compression', 'Vacuum leak', 'Fuel quality poor', 'Carbon buildup on intake valves'], bmwSpecificNotes: 'N54: At 40k+ miles, intake valve carbon buildup very common. Walnut blast cleaning recommended every 40-50k miles.' },
  'P0301': { code: 'P0301', description: 'Cylinder 1 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: 'Swap coil to another cylinder to isolate. N54 coils often fail in pairs.' },
  'P0302': { code: 'P0302', description: 'Cylinder 2 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: '' },
  'P0303': { code: 'P0303', description: 'Cylinder 3 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: '' },
  'P0304': { code: 'P0304', description: 'Cylinder 4 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: '' },
  'P0305': { code: 'P0305', description: 'Cylinder 5 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: '' },
  'P0306': { code: 'P0306', description: 'Cylinder 6 Misfire Detected', system: 'ignition', severity: 'severe', possibleCauses: ['Spark plug', 'Ignition coil', 'Injector', 'Compression'], bmwSpecificNotes: '' },
  'P0313': { code: 'P0313', description: 'Misfire Detected with Low Fuel Level', system: 'fuel', severity: 'moderate', possibleCauses: ['Fuel slosh causing pickup to uncover', 'Fuel pump pickup issue'], bmwSpecificNotes: 'Keep tank above 1/4 to avoid fuel starvation on hard corners' },
  'P0325': { code: 'P0325', description: 'Knock Sensor 1 Circuit (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Knock sensor failure', 'Wiring issue', 'Sensor torque incorrect'], bmwSpecificNotes: 'N54: 20 Nm torque spec critical for knock sensor operation' },
  'P0326': { code: 'P0326', description: 'Knock Sensor 1 Circuit Range/Performance (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Sensor loose', 'Excessive engine noise', 'Sensor failing'], bmwSpecificNotes: '' },
  'P0330': { code: 'P0330', description: 'Knock Sensor 2 Circuit (Bank 2)', system: 'engine', severity: 'severe', possibleCauses: ['Knock sensor failure', 'Wiring issue'], bmwSpecificNotes: 'N54: Second knock sensor on cylinder block' },
  'P0335': { code: 'P0335', description: 'Crankshaft Position Sensor A Circuit', system: 'engine', severity: 'critical', possibleCauses: ['CKP sensor failure', 'Wiring issue', 'Trigger wheel damage', 'Sensor air gap wrong'], bmwSpecificNotes: 'N54: Engine will not start with failed CKP sensor. Check sensor at harmonic balancer.' },
  'P0336': { code: 'P0336', description: 'Crankshaft Position Sensor A Circuit Range/Performance', system: 'engine', severity: 'critical', possibleCauses: ['Damaged trigger wheel', 'Sensor loose', 'Intermittent wiring'], bmwSpecificNotes: 'Check harmonic balancer for wobble (rubber damper failure common)' },
  'P0340': { code: 'P0340', description: 'Camshaft Position Sensor Circuit (Bank 1)', system: 'engine', severity: 'critical', possibleCauses: ['CMP sensor failure', 'Wiring issue', 'Timing chain jumped'], bmwSpecificNotes: 'N54: Intake cam sensor on valve cover' },
  'P0341': { code: 'P0341', description: 'Camshaft Position Sensor Circuit Range/Performance (Bank 1)', system: 'engine', severity: 'critical', possibleCauses: ['Timing chain stretch', 'Sensor failing', 'Contaminated sensor tip'], bmwSpecificNotes: '' },
  'P0345': { code: 'P0345', description: 'Camshaft Position Sensor Circuit (Bank 2)', system: 'engine', severity: 'critical', possibleCauses: ['CMP sensor failure', 'Wiring issue'], bmwSpecificNotes: 'N54: Exhaust cam sensor' },

  // ==================== P0400 - P0499: Emissions ====================
  'P0401': { code: 'P0401', description: 'Exhaust Gas Recirculation Flow Insufficient', system: 'emissions', severity: 'moderate', possibleCauses: ['Clogged EGR passages', 'EGR valve stuck closed', 'EGR cooler clogged'], bmwSpecificNotes: 'N54 has internal EGR via Valvetronic and exhaust cam timing' },
  'P0402': { code: 'P0402', description: 'Exhaust Gas Recirculation Flow Excessive', system: 'emissions', severity: 'moderate', possibleCauses: ['EGR valve stuck open', 'Carbon buildup'], bmwSpecificNotes: '' },
  'P0411': { code: 'P0411', description: 'Secondary Air Injection Incorrect Flow Detected', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump failure', 'Check valve stuck', 'Air hose leak/blocked'], bmwSpecificNotes: 'N54: SAI only operates on cold start. Check valve common failure point.' },
  'P0412': { code: 'P0412', description: 'Secondary Air Injection System Switching Valve A Circuit Malfunction', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI solenoid failure', 'Wiring issue'], bmwSpecificNotes: '' },
  'P0420': { code: 'P0420', description: 'Catalyst System Efficiency Below Threshold (Bank 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['Catalytic converter degraded', 'O2 sensor failing', 'Exhaust leak'], bmwSpecificNotes: 'N54: Downpipes with high-flow cats may trigger this. Check cat efficiency with exhaust gas analyzer.' },
  'P0430': { code: 'P0430', description: 'Catalyst System Efficiency Below Threshold (Bank 2)', system: 'emissions', severity: 'moderate', possibleCauses: ['Catalytic converter degraded', 'O2 sensor failing'], bmwSpecificNotes: '' },
  'P0440': { code: 'P0440', description: 'Evaporative Emission Control System Malfunction', system: 'emissions', severity: 'minor', possibleCauses: ['Gas cap loose/failed seal', 'EVAP purge valve stuck', 'Charcoal canister saturated', 'Leak in EVAP lines'], bmwSpecificNotes: 'N54: Start with gas cap - most common cause. Tighten until 3 clicks.' },
  'P0441': { code: 'P0441', description: 'Evaporative Emission Control System Incorrect Purge Flow', system: 'emissions', severity: 'minor', possibleCauses: ['Purge valve stuck', 'Blocked purge line'], bmwSpecificNotes: '' },
  'P0442': { code: 'P0442', description: 'Evaporative Emission Control System Leak Detected (small leak)', system: 'emissions', severity: 'minor', possibleCauses: ['Gas cap seal', 'Small EVAP line crack', 'Purge valve not sealing'], bmwSpecificNotes: 'N54 #1 EVAP code. Replace gas cap, check filler neck seal.' },
  'P0445': { code: 'P0445', description: 'Evaporative Emission Control System Purge Control Valve Circuit Shorted', system: 'emissions', severity: 'minor', possibleCauses: ['Purge valve shorted', 'Wiring short'], bmwSpecificNotes: '' },
  'P0455': { code: 'P0455', description: 'Evaporative Emission Control System Leak Detected (gross leak)', system: 'emissions', severity: 'minor', possibleCauses: ['Gas cap missing/loose', 'Large EVAP line break', 'Fuel tank leak'], bmwSpecificNotes: 'Check gas cap first' },
  'P0456': { code: 'P0456', description: 'Evaporative Emission Control System Leak Detected (very small leak)', system: 'emissions', severity: 'minor', possibleCauses: ['Microscopic EVAP leak', 'Gas cap seal micro-crack', 'Purge valve not sealing'], bmwSpecificNotes: 'N54: Smoke test required to find very small leaks' },
  'P0491': { code: 'P0491', description: 'Secondary Air Injection System Insufficient Flow (Bank 1)', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump weak', 'Check valve stuck closed', 'Hose blocked'], bmwSpecificNotes: 'N54: Common on cold mornings. SAI pump only runs ~90 seconds on cold start.' },
  'P0492': { code: 'P0492', description: 'Secondary Air Injection System Insufficient Flow (Bank 2)', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump weak', 'Check valve stuck closed'], bmwSpecificNotes: '' },

  // ==================== P0500 - P0599: Idle / Speed Control ====================
  'P0500': { code: 'P0500', description: 'Vehicle Speed Sensor A', system: 'electrical', severity: 'moderate', possibleCauses: ['VSS failure', 'Wiring issue', 'ABS module issue'], bmwSpecificNotes: 'N54 gets vehicle speed from DSC module via CAN bus' },
  'P0505': { code: 'P0505', description: 'Idle Air Control System', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body dirty', 'Vacuum leak', 'Idle actuator failure'], bmwSpecificNotes: 'N54 uses electronic throttle body - no separate IAC valve' },
  'P0506': { code: 'P0506', description: 'Idle Air Control System RPM Lower Than Expected', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body dirty', 'Vacuum leak', 'Alternator load'], bmwSpecificNotes: 'Clean throttle body, check for vacuum leaks' },
  'P0507': { code: 'P0507', description: 'Idle Air Control System RPM Higher Than Expected', system: 'engine', severity: 'moderate', possibleCauses: ['Vacuum leak', 'Throttle plate not closing', 'High alternator load'], bmwSpecificNotes: 'N54: Check valve cover/PCV for air leak' },
  'P0520': { code: 'P0520', description: 'Engine Oil Pressure Sensor/Switch Circuit', system: 'engine', severity: 'severe', possibleCauses: ['Oil pressure sensor failure', 'Wiring issue', 'Low oil pressure'], bmwSpecificNotes: 'N54: Verify actual oil pressure with mechanical gauge before replacing sensor' },
  'P0521': { code: 'P0521', description: 'Engine Oil Pressure Sensor/Switch Range/Performance', system: 'engine', severity: 'severe', possibleCauses: ['Sensor drifting', 'Actual oil pressure fluctuating', 'Wiring resistance'], bmwSpecificNotes: 'N54: Check oil level and condition. Use correct BMW LL-01 spec oil.' },
  'P052B': { code: 'P052B', description: 'Cold Start Camshaft Position Timing Over-Retarded (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid slow response', 'Oil contamination', 'Low oil pressure cold'], bmwSpecificNotes: 'N54: Use 5W-30 or 0W-40 for cold climate. Oil grade critical for Vanos cold operation.' },
  'P052C': { code: 'P052C', description: 'Cold Start Camshaft Position Timing Over-Retarded (Bank 2)', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid slow response', 'Oil contamination'], bmwSpecificNotes: '' },
  'P054B': { code: 'P054B', description: 'Cold Start Exhaust Camshaft Position Timing Over-Retarded (Bank 1)', system: 'engine', severity: 'severe', possibleCauses: ['Exhaust Vanos solenoid', 'Oil quality', 'Chain stretch'], bmwSpecificNotes: '' },

  // ==================== P0600 - P0699: ECM / Internal ====================
  'P0600': { code: 'P0600', description: 'Serial Communication Link', system: 'electrical', severity: 'critical', possibleCauses: ['CAN bus fault', 'Module failure', 'Wiring issue'], bmwSpecificNotes: 'Check PT-CAN and K-CAN bus voltages' },
  'P0601': { code: 'P0601', description: 'Internal Control Module Memory Check Sum Error', system: 'electrical', severity: 'critical', possibleCauses: ['ECM internal failure', 'Power supply issue', 'Software corruption'], bmwSpecificNotes: 'DME may need reprogramming or replacement' },
  'P0604': { code: 'P0604', description: 'Internal Control Module RAM Error', system: 'electrical', severity: 'critical', possibleCauses: ['DME hardware failure'], bmwSpecificNotes: 'DME replacement likely required' },
  'P0605': { code: 'P0605', description: 'Internal Control Module ROM Error', system: 'electrical', severity: 'critical', possibleCauses: ['Software corruption', 'Hardware failure'], bmwSpecificNotes: 'Try DME reprogramming first' },
  'P0606': { code: 'P0606', description: 'ECM/PCM Processor', system: 'electrical', severity: 'critical', possibleCauses: ['DME internal processor failure'], bmwSpecificNotes: 'N54 DME MSD80/81 processor fault. Professional diagnosis required.' },
  'P0607': { code: 'P0607', description: 'Control Module Performance', system: 'electrical', severity: 'critical', possibleCauses: ['DME overheating', 'Power supply issue', 'Internal fault'], bmwSpecificNotes: 'Check DME cooling and power/ground connections' },
  'P0638': { code: 'P0638', description: 'Throttle Actuator Control Range/Performance (Bank 1)', system: 'engine', severity: 'critical', possibleCauses: ['Throttle body failure', 'Binding throttle plate'], bmwSpecificNotes: 'N54: Throttle body is integrated unit, usually replaced as assembly' },
  'P0642': { code: 'P0642', description: 'Sensor Reference Voltage A Circuit Low', system: 'electrical', severity: 'critical', possibleCauses: ['Short to ground in 5V reference circuit', 'ECM failure'], bmwSpecificNotes: 'Multiple sensors affected - check all 5V reference sensors' },
  'P0643': { code: 'P0643', description: 'Sensor Reference Voltage A Circuit High', system: 'electrical', severity: 'critical', possibleCauses: ['Short to power in 5V reference circuit'], bmwSpecificNotes: '' },
  'P0652': { code: 'P0652', description: 'Sensor Reference Voltage B Circuit Low', system: 'electrical', severity: 'critical', possibleCauses: ['Short to ground in 5V reference circuit'], bmwSpecificNotes: '' },
  'P0685': { code: 'P0685', description: 'ECM/PCM Power Relay Control Circuit/Open', system: 'electrical', severity: 'critical', possibleCauses: ['DME main relay failure', 'Wiring issue', 'Poor ground'], bmwSpecificNotes: 'N54: Check DME relay in E-Box and power distribution' },
  'P0688': { code: 'P0688', description: 'ECM/PCM Power Relay Sense Circuit Low', system: 'electrical', severity: 'critical', possibleCauses: ['DME relay contacts failing', 'Wiring voltage drop'], bmwSpecificNotes: 'N54: Common cause of no-start. Check E-Box fuses and DME relay.' },
  'P0690': { code: 'P0690', description: 'Cooling Fan 1 Control Circuit High', system: 'engine', severity: 'moderate', possibleCauses: ['Fan motor short', 'Control module failure'], bmwSpecificNotes: 'N54: Electric cooling fan - check PWM signal from DME' },

  // ==================== P0700 - P0899: Transmission ====================
  'P0700': { code: 'P0700', description: 'Transmission Control System Malfunction', system: 'transmission', severity: 'severe', possibleCauses: ['EGS module fault', 'Communication issue', 'Internal transmission fault'], bmwSpecificNotes: 'N54 with GA6HP19Z: Read EGS fault codes separately' },
  'P0711': { code: 'P0711', description: 'Transmission Fluid Temperature Sensor Circuit Range/Performance', system: 'transmission', severity: 'moderate', possibleCauses: ['TFT sensor failure', 'Wiring issue', 'Overheating transmission'], bmwSpecificNotes: 'GA6HP19Z: Monitor trans temp during hard driving' },
  'P0729': { code: 'P0729', description: 'Gear 6 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch pack slipping', 'Solenoid valve failure', 'Low line pressure'], bmwSpecificNotes: 'GA6HP19Z: Common with aged mechatronics unit. Adaptation reset may help temporarily.' },
  'P0730': { code: 'P0730', description: 'Incorrect Gear Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Multiple clutch packs slipping', 'Severe transmission wear'], bmwSpecificNotes: 'GA6HP19Z: Likely requires transmission rebuild or replacement' },
  'P0731': { code: 'P0731', description: 'Gear 1 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch A slipping', 'Solenoid issue', 'Low pressure'], bmwSpecificNotes: '' },
  'P0732': { code: 'P0732', description: 'Gear 2 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch B slipping', 'Solenoid issue'], bmwSpecificNotes: '' },
  'P0733': { code: 'P0733', description: 'Gear 3 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch C slipping', 'Solenoid issue'], bmwSpecificNotes: '' },
  'P0734': { code: 'P0734', description: 'Gear 4 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch D slipping', 'Solenoid issue'], bmwSpecificNotes: '' },
  'P0735': { code: 'P0735', description: 'Gear 5 Incorrect Ratio', system: 'transmission', severity: 'severe', possibleCauses: ['Clutch E slipping', 'Solenoid issue'], bmwSpecificNotes: '' },
  'P0741': { code: 'P0741', description: 'Torque Converter Clutch Solenoid Circuit Performance/Stuck Off', system: 'transmission', severity: 'moderate', possibleCauses: ['TCC solenoid failure', 'Torque converter failure', 'Valve body issue'], bmwSpecificNotes: 'GA6HP19Z: TCC engagement issues cause slightly higher RPM at highway speeds and reduced fuel economy' },
  'P0760': { code: 'P0760', description: 'Shift Solenoid C Malfunction', system: 'transmission', severity: 'severe', possibleCauses: ['Solenoid failure', 'Mechatronics unit issue', 'Wiring'], bmwSpecificNotes: 'GA6HP19Z: Multiple solenoids in mechatronics - often requires unit replacement' },
  'P0765': { code: 'P0765', description: 'Shift Solenoid D Malfunction', system: 'transmission', severity: 'severe', possibleCauses: ['Solenoid failure', 'Mechatronics unit issue'], bmwSpecificNotes: '' },

  // ==================== P1100 - P1199: BMW Specific ====================
  'P1100': { code: 'P1100', description: 'Mass Air Flow Sensor Signal Out of Range', system: 'engine', severity: 'severe', possibleCauses: ['MAF sensor failure', 'Extremely high boost leak'], bmwSpecificNotes: '' },
  'P112F': { code: 'P112F', description: 'Manifold Absolute Pressure/Mass Air Flow - Throttle Position Correlation at Higher Load', system: 'engine', severity: 'severe', possibleCauses: ['Charge pipe leak', 'Boost leak', 'MAF sensor issue', 'Throttle body issue'], bmwSpecificNotes: 'N54: Almost always a boost leak. Smoke test intake system. Check charge pipe, intercooler connections, diverter valves.' },
  'P113A': { code: 'P113A', description: 'O2 Sensor Signal Stuck Lean - Bank 1 Sensor 1', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failing', 'Actual lean condition', 'Exhaust leak'], bmwSpecificNotes: '' },
  'P113B': { code: 'P113B', description: 'O2 Sensor Signal Stuck Rich - Bank 1 Sensor 1', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor failing', 'Actual rich condition'], bmwSpecificNotes: '' },
  'P115C': { code: 'P115C', description: 'Mass Airflow Sensor Plausibility - Airflow Too Low', system: 'engine', severity: 'severe', possibleCauses: ['MAF under-reading', 'Severe intake restriction', 'Turbo not producing boost'], bmwSpecificNotes: 'N54: Check air filter, intake boot, MAF sensor cleanliness' },
  'P1190': { code: 'P1190', description: 'Pre-Catalyst Fuel Trim Too Rich Bank 1', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking injector', 'HPFP over-delivering', 'MAF under-reading'], bmwSpecificNotes: 'N54: Check injector leakdown test' },
  'P1191': { code: 'P1191', description: 'Pre-Catalyst Fuel Trim Too Rich Bank 2', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking injector', 'HPFP issue'], bmwSpecificNotes: '' },
  'P1192': { code: 'P1192', description: 'Post-Catalyst Fuel Trim Too Rich Bank 1', system: 'fuel', severity: 'moderate', possibleCauses: ['Cat efficiency low', 'O2 sensor reading rich'], bmwSpecificNotes: '' },
  'P1193': { code: 'P1193', description: 'Post-Catalyst Fuel Trim Too Rich Bank 2', system: 'fuel', severity: 'moderate', possibleCauses: ['Cat efficiency low', 'O2 sensor reading rich'], bmwSpecificNotes: '' },

  // ==================== P1200 - P1299: Fuel / Injectors ====================
  'P1201': { code: 'P1201', description: 'Cylinder 1 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault', 'DME injector driver'], bmwSpecificNotes: '' },
  'P1202': { code: 'P1202', description: 'Cylinder 2 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault'], bmwSpecificNotes: '' },
  'P1203': { code: 'P1203', description: 'Cylinder 3 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault'], bmwSpecificNotes: '' },
  'P1204': { code: 'P1204', description: 'Cylinder 4 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault'], bmwSpecificNotes: '' },
  'P1205': { code: 'P1205', description: 'Cylinder 5 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault'], bmwSpecificNotes: '' },
  'P1206': { code: 'P1206', description: 'Cylinder 6 Fuel Injection Fault', system: 'fuel', severity: 'critical', possibleCauses: ['Injector electrical fault'], bmwSpecificNotes: '' },
  'P12A1': { code: 'P12A1', description: 'Fuel Pump Delivery Rate Too Low', system: 'fuel', severity: 'severe', possibleCauses: ['LPFP weak', 'Clogged fuel filter', 'EKP module issue', 'HPFP failing'], bmwSpecificNotes: 'N54: Check LPFP pressure first (should be ~5 bar at idle). Then check HPFP capability under WOT.' },
  'P12A2': { code: 'P12A2', description: 'Fuel Pump Delivery Rate Too High', system: 'fuel', severity: 'severe', possibleCauses: ['Fuel pressure regulator stuck', 'EKP module over-driving'], bmwSpecificNotes: '' },

  // ==================== P1300 - P1399: Misfire / Ignition BMW ====================
  'P1300': { code: 'P1300', description: 'Misfire Detection Monitor Not Enabled', system: 'ignition', severity: 'info', possibleCauses: [' Catalyst damaging misfire not detected', 'System disabled due to fault'], bmwSpecificNotes: '' },
  'P132B': { code: 'P132B', description: 'Turbocharger/Supercharger Boost Control A Performance', system: 'engine', severity: 'severe', possibleCauses: ['Boost control solenoid', 'Wastegate actuator mechanical issue', 'Vacuum supply'], bmwSpecificNotes: 'N54: Check boost solenoid operation with ISTA activation test. Check vacuum lines for cracks.' },
  'P1342': { code: 'P1342', description: 'Misfire During Startup - Cylinder 1', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Fuel injector dribbling', 'Low compression cold'], bmwSpecificNotes: 'N54: Common with aged coils. Replace all 6 if >60k miles.' },
  'P1343': { code: 'P1343', description: 'Misfire During Startup - Cylinder 2', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Injector issue'], bmwSpecificNotes: '' },
  'P1344': { code: 'P1344', description: 'Misfire During Startup - Cylinder 3', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Injector issue'], bmwSpecificNotes: '' },
  'P1345': { code: 'P1345', description: 'Misfire During Startup - Cylinder 4', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Injector issue'], bmwSpecificNotes: '' },
  'P1346': { code: 'P1346', description: 'Misfire During Startup - Cylinder 5', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Injector issue'], bmwSpecificNotes: '' },
  'P1347': { code: 'P1347', description: 'Misfire During Startup - Cylinder 6', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil cold', 'Injector issue'], bmwSpecificNotes: '' },
  'P1351': { code: 'P1351', description: 'Ignition Coil Cylinder 1 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue', 'DME driver'], bmwSpecificNotes: '' },
  'P1352': { code: 'P1352', description: 'Ignition Coil Cylinder 2 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue'], bmwSpecificNotes: '' },
  'P1353': { code: 'P1353', description: 'Ignition Coil Cylinder 3 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue'], bmwSpecificNotes: '' },
  'P1354': { code: 'P1354', description: 'Ignition Coil Cylinder 4 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue'], bmwSpecificNotes: '' },
  'P1355': { code: 'P1355', description: 'Ignition Coil Cylinder 5 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue'], bmwSpecificNotes: '' },
  'P1356': { code: 'P1356', description: 'Ignition Coil Cylinder 6 - Circuit Malfunction', system: 'ignition', severity: 'severe', possibleCauses: ['Coil primary circuit open', 'Wiring issue'], bmwSpecificNotes: '' },
  'P135A': { code: 'P135A', description: 'Ignition Coil Energy - Cylinder 1', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output', 'Spark plug gap too large', 'High resistance in secondary'], bmwSpecificNotes: 'N54: Indicates coil cannot deliver enough energy. Replace coil and check plug gap.' },
  'P135B': { code: 'P135B', description: 'Ignition Coil Energy - Cylinder 2', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output'], bmwSpecificNotes: '' },
  'P135C': { code: 'P135C', description: 'Ignition Coil Energy - Cylinder 3', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output'], bmwSpecificNotes: '' },
  'P135D': { code: 'P135D', description: 'Ignition Coil Energy - Cylinder 4', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output'], bmwSpecificNotes: '' },
  'P135E': { code: 'P135E', description: 'Ignition Coil Energy - Cylinder 5', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output'], bmwSpecificNotes: '' },
  'P135F': { code: 'P135F', description: 'Ignition Coil Energy - Cylinder 6', system: 'ignition', severity: 'severe', possibleCauses: ['Weak coil output'], bmwSpecificNotes: '' },
  'P13B0': { code: 'P13B0', description: 'Camshaft Position Actuator - Slow Response Bank 1', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid slow', 'Oil quality', 'Mechanical resistance'], bmwSpecificNotes: 'N54: Oil change with correct viscosity often resolves' },
  'P13B1': { code: 'P13B1', description: 'Camshaft Position Actuator - Slow Response Bank 2', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid slow', 'Oil quality'], bmwSpecificNotes: '' },
  'P13B2': { code: 'P13B2', description: 'Exhaust Camshaft Position Actuator - Movement Does Not Reach Setpoint Bank 1', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failing', 'Chain stretch preventing adjustment', 'Oil pressure low'], bmwSpecificNotes: 'N54: Chain stretch can prevent Vanos from reaching target angle. Measure chain stretch.' },
  'P13B3': { code: 'P13B3', description: 'Exhaust Camshaft Position Actuator - Movement Does Not Reach Setpoint Bank 2', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failing', 'Chain stretch'], bmwSpecificNotes: '' },
  'P13B4': { code: 'P13B4', description: 'Intake Camshaft Position Actuator - Movement Does Not Reach Setpoint Bank 1', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failing', 'Chain stretch'], bmwSpecificNotes: '' },
  'P13B5': { code: 'P13B5', description: 'Intake Camshaft Position Actuator - Movement Does Not Reach Setpoint Bank 2', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid failing', 'Chain stretch'], bmwSpecificNotes: '' },

  // ==================== P1400 - P1499: Emissions BMW ====================
  'P1415': { code: 'P1415', description: 'Secondary Air Injection System Bank 1 - Flow Rate Too Low', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump weak', 'Check valve stuck', 'Hose leak'], bmwSpecificNotes: '' },
  'P1416': { code: 'P1416', description: 'Secondary Air Injection System Bank 2 - Flow Rate Too Low', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump weak', 'Check valve stuck'], bmwSpecificNotes: '' },
  'P1420': { code: 'P1420', description: 'Secondary Air Injection Valve Stuck Open', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI valve stuck', 'Carbon buildup'], bmwSpecificNotes: '' },
  'P1423': { code: 'P1423', description: 'Secondary Air System Bank 1 - Insufficient Flow Detected', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump inoperative', 'Check valve failed', 'Hose disconnected'], bmwSpecificNotes: 'N54: Common code. SAI pump runs on cold start only. Check valve is typical failure.' },
  'P1424': { code: 'P1424', description: 'Secondary Air System Bank 2 - Insufficient Flow Detected', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI pump inoperative', 'Check valve failed'], bmwSpecificNotes: '' },
  'P147D': { code: 'P147D', description: 'Fuel Tank Ventilation System - High Flow Detected', system: 'emissions', severity: 'minor', possibleCauses: ['Purge valve stuck open', 'Leak detection pump issue'], bmwSpecificNotes: '' },
  'P14A0': { code: 'P14A0', description: 'Exhaust Camshaft Adjustment - Bank 1 - Actuator Stuck', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid mechanically stuck', 'Debris in oil passages', 'Chain tensioner failure'], bmwSpecificNotes: 'N54: Remove and clean Vanos solenoid. Check oil filter for debris.' },
  'P14A1': { code: 'P14A1', description: 'Exhaust Camshaft Adjustment - Bank 2 - Actuator Stuck', system: 'engine', severity: 'severe', possibleCauses: ['Vanos solenoid mechanically stuck', 'Debris in oil passages'], bmwSpecificNotes: '' },

  // ==================== P1500 - P1599: Idle / Electrical ====================
  'P1500': { code: 'P1500', description: 'Idle Speed Control Valve - Stuck Open', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body fouling', 'Software issue'], bmwSpecificNotes: 'N54: Perform throttle adaptation via ISTA' },
  'P1501': { code: 'P1501', description: 'Idle Speed Control Valve - Stuck Closed', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body fouling', 'Binding throttle plate'], bmwSpecificNotes: '' },
  'P1510': { code: 'P1510', description: 'Idle Speed Control - RPM Too Low', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body dirty', 'Vacuum leak', 'Electrical load'], bmwSpecificNotes: '' },
  'P1520': { code: 'P1520', description: 'Idle Speed Control - RPM Too High', system: 'engine', severity: 'moderate', possibleCauses: ['Vacuum leak', 'Throttle plate not closing fully'], bmwSpecificNotes: '' },
  'P1551': { code: 'P1551', description: 'Idle Speed Control Valve - Closing Coil Circuit Open', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body actuator failure'], bmwSpecificNotes: 'N54: Integrated throttle body actuator - replace whole unit' },
  'P1552': { code: 'P1552', description: 'Idle Speed Control Valve - Closing Coil Circuit Short', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body actuator internal short'], bmwSpecificNotes: '' },
  'P1553': { code: 'P1553', description: 'Idle Speed Control Valve - Opening Coil Circuit Open', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body actuator failure'], bmwSpecificNotes: '' },
  'P1554': { code: 'P1554', description: 'Idle Speed Control Valve - Opening Coil Circuit Short', system: 'engine', severity: 'moderate', possibleCauses: ['Throttle body actuator internal short'], bmwSpecificNotes: '' },
  'P1555': { code: 'P1555', description: 'Charge Pressure Actuator - Boost Pressure Too Low', system: 'engine', severity: 'severe', possibleCauses: ['Wastegate stuck open', 'Charge pipe leak', 'Turbo failing', 'Boost solenoid failure'], bmwSpecificNotes: 'N54: Most common = charge pipe leak. Check all connections, especially plastic charge pipe near throttle body.' },
  'P1556': { code: 'P1556', description: 'Charge Pressure Actuator - Boost Pressure Too High', system: 'engine', severity: 'severe', possibleCauses: ['Wastegate stuck closed', 'Boost solenoid stuck', 'Overboost'], bmwSpecificNotes: 'N54: Dangerous - can damage engine. Check wastegate actuator rod movement.' },
  'P1557': { code: 'P1557', description: 'Charge Pressure Actuator - Short Circuit', system: 'engine', severity: 'severe', possibleCauses: ['Boost solenoid short', 'Wiring short to power/ground'], bmwSpecificNotes: '' },
  'P1558': { code: 'P1558', description: 'Charge Pressure Actuator - Open Circuit', system: 'engine', severity: 'severe', possibleCauses: ['Boost solenoid open coil', 'Wiring break'], bmwSpecificNotes: '' },
  'P1575': { code: 'P1575', description: 'Throttle Valve Actuator - Mechanical Stop Adaptation Not Performed', system: 'engine', severity: 'moderate', possibleCauses: ['New throttle body not adapted', 'Battery disconnected'], bmwSpecificNotes: 'N54: Must perform throttle adaptation after throttle body replacement or battery disconnect' },
  'P15A0': { code: 'P15A0', description: 'Engine Oil Pressure - Too Low', system: 'engine', severity: 'critical', possibleCauses: ['Low oil level', 'Worn oil pump', 'Oil pickup clogged', 'Bearing wear', 'Wrong oil viscosity'], bmwSpecificNotes: 'N54: CRITICAL - Stop engine immediately. Check oil level. If OK, check with mechanical gauge. If truly low, engine damage imminent.' },
  'P15A1': { code: 'P15A1', description: 'Engine Oil Pressure - Too High', system: 'engine', severity: 'severe', possibleCauses: ['Oil pressure relief valve stuck', 'Blocked oil passage', 'Wrong oil viscosity (too thick)'], bmwSpecificNotes: 'N54: Verify oil spec. 0W-40 or 5W-30 LL-01 only.' },

  // ==================== P1600 - P1699: Internal DME ====================
  'P1600': { code: 'P1600', description: 'DME Internal Error', system: 'electrical', severity: 'critical', possibleCauses: ['DME hardware failure', 'Power supply issue'], bmwSpecificNotes: 'Professional diagnosis required. May need DME replacement.' },
  'P1601': { code: 'P1601', description: 'DME Internal Memory Error', system: 'electrical', severity: 'critical', possibleCauses: ['Software corruption', 'Hardware failure'], bmwSpecificNotes: 'Try reprogramming first' },
  'P1602': { code: 'P1602', description: 'DME Communication Fault', system: 'electrical', severity: 'critical', possibleCauses: ['CAN bus fault', 'DME power/ground issue'], bmwSpecificNotes: 'Check DME power, ground, and CAN bus connections in E-Box' },
  'P1617': { code: 'P1617', description: 'Engine Oil Temperature Sensor - Signal Plausibility', system: 'engine', severity: 'moderate', possibleCauses: ['Sensor drifting', 'Actual temperature issue'], bmwSpecificNotes: '' },
  'P1620': { code: 'P1620', description: 'Engine Cooling System - Thermostat Stuck Open', system: 'engine', severity: 'moderate', possibleCauses: ['Thermostat failure', 'Coolant temperature too low'], bmwSpecificNotes: 'N54: Replace with 88C thermostat' },
  'P1621': { code: 'P1621', description: 'Engine Cooling System - Thermostat Stuck Closed', system: 'engine', severity: 'critical', possibleCauses: ['Thermostat failure', 'Overheating risk'], bmwSpecificNotes: 'N54: Risk of overheating. Replace thermostat immediately.' },
  'P1622': { code: 'P1622', description: 'Engine Cooling System - Coolant Temperature Too High', system: 'engine', severity: 'critical', possibleCauses: ['Coolant leak', 'Water pump failure', 'Fan failure', 'Thermostat stuck closed'], bmwSpecificNotes: 'N54: Check electric water pump (common failure). Check coolant level.' },
  'P1623': { code: 'P1623', description: 'Engine Cooling System - Coolant Temperature Too Low', system: 'engine', severity: 'moderate', possibleCauses: ['Thermostat stuck open', 'Sensor fault'], bmwSpecificNotes: '' },
  'P1638': { code: 'P1638', description: 'Throttle Valve Adaptation - Lower Limit Not Reached', system: 'engine', severity: 'moderate', possibleCauses: ['Carbon buildup preventing closure', 'Throttle body wear'], bmwSpecificNotes: 'N54: Clean throttle body thoroughly' },
  'P1639': { code: 'P1639', description: 'Throttle Valve Adaptation - Upper Limit Not Reached', system: 'engine', severity: 'moderate', possibleCauses: ['Binding throttle plate', 'Actuator weak'], bmwSpecificNotes: '' },
  'P1642': { code: 'P1642', description: 'Throttle Valve Emergency Run - Throttle Valve Spring Test', system: 'engine', severity: 'critical', possibleCauses: ['Throttle return spring weak', 'Throttle body failure'], bmwSpecificNotes: 'N54: Throttle must close to limp home position when power removed. Replace throttle body.' },
  'P1660': { code: 'P1660', description: 'Engine Cooling System - Pump Speed Out of Range', system: 'engine', severity: 'severe', possibleCauses: ['Electric water pump failing', 'PWM signal issue', 'Pump impeller detached'], bmwSpecificNotes: 'N54: Electric water pump common failure at 60-80k miles. Listen for pump running after shutdown (should run ~5 min if hot).' },
  'P1681': { code: 'P1681', description: 'Control Module Internal Watchdog - Reset Occurred', system: 'electrical', severity: 'critical', possibleCauses: ['DME power supply interruption', 'Software crash', 'Hardware fault'], bmwSpecificNotes: 'Check battery voltage stability and DME power connections' },
  'P1696': { code: 'P1696', description: 'Crankshaft Position Sensor - Signal Error', system: 'engine', severity: 'critical', possibleCauses: ['Sensor tip damaged', 'Trigger wheel damaged', 'Excessive air gap', 'Wiring interference'], bmwSpecificNotes: 'N54: Check harmonic balancer for wobble. Check sensor mounting torque (air gap critical).' },

  // ==================== P20xx: Emissions (OBD-II) ====================
  'P2002': { code: 'P2002', description: 'Diesel Particulate Filter Efficiency Below Threshold', system: 'emissions', severity: 'moderate', possibleCauses: ['DPF clogged', 'Differential pressure sensor'], bmwSpecificNotes: 'M57 diesel only' },
  'P2096': { code: 'P2096', description: 'Post Catalyst Fuel Trim System Too Lean Bank 1', system: 'emissions', severity: 'moderate', possibleCauses: ['Post-cat O2 sensor', 'Small exhaust leak', 'Cat degradation'], bmwSpecificNotes: '' },
  'P2097': { code: 'P2097', description: 'Post Catalyst Fuel Trim System Too Rich Bank 1', system: 'emissions', severity: 'moderate', possibleCauses: ['Post-cat O2 sensor', 'Rich condition'], bmwSpecificNotes: '' },
  'P2187': { code: 'P2187', description: 'System Too Lean at Idle Bank 1', system: 'fuel', severity: 'severe', possibleCauses: ['Intake leak at idle', 'PCV failure', 'Injector dribble'], bmwSpecificNotes: 'N54: PCV valve/cap common failure. Also check injector leakdown.' },
  'P2188': { code: 'P2188', description: 'System Too Rich at Idle Bank 1', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking injector', 'Rich cold start'], bmwSpecificNotes: '' },
  'P2190': { code: 'P2190', description: 'System Too Lean at Idle Bank 2', system: 'fuel', severity: 'severe', possibleCauses: ['Intake leak at idle'], bmwSpecificNotes: '' },
  'P2191': { code: 'P2191', description: 'System Too Rich at Idle Bank 2', system: 'fuel', severity: 'severe', possibleCauses: ['Leaking injector'], bmwSpecificNotes: '' },

  // ==================== P22xx: OBD-II Emissions ====================
  'P2227': { code: 'P2227', description: 'Barometric Pressure Circuit Range/Performance', system: 'electrical', severity: 'moderate', possibleCauses: ['Baro sensor in DME failure', 'Software issue'], bmwSpecificNotes: 'DME uses internal barometric sensor' },

  // ==================== P2400 - P2499: EVAP Leak Detection ====================
  'P2400': { code: 'P2400', description: 'EVAP Leak Detection Pump Control Circuit/Open', system: 'emissions', severity: 'minor', possibleCauses: ['LDP pump failure', 'Wiring issue'], bmwSpecificNotes: '' },
  'P2401': { code: 'P2401', description: 'EVAP Leak Detection Pump Control Circuit Low', system: 'emissions', severity: 'minor', possibleCauses: ['Short to ground', 'Pump failure'], bmwSpecificNotes: '' },
  'P2402': { code: 'P2402', description: 'EVAP Leak Detection Pump Control Circuit High', system: 'emissions', severity: 'minor', possibleCauses: ['Short to power'], bmwSpecificNotes: '' },
  'P2420': { code: 'P2420', description: 'EVAP Switching Valve Control Circuit/Open', system: 'emissions', severity: 'minor', possibleCauses: ['Valve failure', 'Wiring issue'], bmwSpecificNotes: '' },
  'P2440': { code: 'P2440', description: 'Secondary Air Injection System Switching Valve Stuck Open Bank 1', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI valve stuck', 'Carbon buildup'], bmwSpecificNotes: '' },
  'P2441': { code: 'P2441', description: 'Secondary Air Injection System Switching Valve Stuck Closed Bank 1', system: 'emissions', severity: 'moderate', possibleCauses: ['SAI valve stuck', 'Actuator failure'], bmwSpecificNotes: '' },

  // ==================== P2A00: O2 Sensors ====================
  'P2A00': { code: 'P2A00', description: 'O2 Sensor Circuit Range/Performance Bank 1 Sensor 1', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor aging', 'Response time slow'], bmwSpecificNotes: 'N54: O2 sensors last 60-80k miles typically' },
  'P2A03': { code: 'P2A03', description: 'O2 Sensor Circuit Range/Performance Bank 2 Sensor 1', system: 'emissions', severity: 'moderate', possibleCauses: ['O2 sensor aging'], bmwSpecificNotes: '' },

  // ==================== U0001 - U0999: CAN Bus ====================
  'U0001': { code: 'U0001', description: 'High Speed CAN Communication Bus', system: 'electrical', severity: 'critical', possibleCauses: ['CAN bus short', 'Module failure', 'Wiring damage'], bmwSpecificNotes: 'Check PT-CAN H and L voltages (should be ~2.5V each, differential)' },
  'U0100': { code: 'U0100', description: 'Lost Communication with ECM/PCM A', system: 'electrical', severity: 'critical', possibleCauses: ['DME power loss', 'CAN bus fault', 'DME failure'], bmwSpecificNotes: 'N54: Check DME fuses and relay in E-Box first' },
  'U0101': { code: 'U0101', description: 'Lost Communication with TCM', system: 'electrical', severity: 'critical', possibleCauses: ['EGS power loss', 'CAN bus fault', 'EGS module failure'], bmwSpecificNotes: 'GA6HP19Z: EGS located on transmission. Check power and CAN connections.' },
  'U0121': { code: 'U0121', description: 'Lost Communication with Anti-Lock Brake System Control Module', system: 'electrical', severity: 'critical', possibleCauses: ['DSC module power loss', 'CAN bus fault'], bmwSpecificNotes: 'N54: DSC provides wheel speed signals to DME' },
  'U0155': { code: 'U0155', description: 'Lost Communication with Instrument Panel Cluster', system: 'electrical', severity: 'moderate', possibleCauses: ['KOMBI module power/communication issue'], bmwSpecificNotes: '' },
};

/**
 * Look up a DTC code in the database.
 * Returns detailed info including BMW-specific notes.
 */
export function lookupDTC(code: string): DTCCode | undefined {
  const normalized = code.toUpperCase().trim();
  return DTC_DATABASE[normalized];
}

/**
 * Get severity color for UI display.
 */
export function getSeverityColor(severity: DTCCode['severity']): string {
  switch (severity) {
    case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'minor': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    case 'moderate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'severe': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
  }
}

/**
 * Get severity label.
 */
export function getSeverityLabel(severity: DTCCode['severity']): string {
  switch (severity) {
    case 'info': return 'Info';
    case 'minor': return 'Minor';
    case 'moderate': return 'Moderate';
    case 'severe': return 'Severe';
    case 'critical': return 'CRITICAL';
  }
}

/**
 * Get system icon color.
 */
export function getSystemColor(system: DTCCode['system']): string {
  switch (system) {
    case 'engine': return 'text-red-400';
    case 'fuel': return 'text-orange-400';
    case 'ignition': return 'text-yellow-400';
    case 'emissions': return 'text-green-400';
    case 'transmission': return 'text-purple-400';
    case 'electrical': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export { DTC_DATABASE };
