// BMW E60 Coder Pro - Vehicle Order (VO) Editor
// The Vehicle Order is BMW's coding data that determines installed features.
// Editing the VO enables/disables options like AFS, active steering, etc.

export interface VOOption {
  code: string;
  name: string;
  category: 'steering' | 'engine' | 'transmission' | 'safety' | 'comfort' | 'lighting' | 'electronic' | 'body';
  description: string;
  requiresHardware: boolean;
  warning?: string;
  defaultEnabled: boolean;
}

export interface VOCode {
  code: string;
  value: string;
  module: string;
  description: string;
}

export const VO_OPTIONS: VOOption[] = [
  // Steering
  { code: '2VB', name: 'Active Front Steering (AFS)', category: 'steering', description: 'Active Front Steering - variable steering ratio via actuator', requiresHardware: true, warning: 'Requires AFS hardware ( actuator + control module )', defaultEnabled: false },
  { code: '2VH', name: 'Active Steering', category: 'steering', description: 'Full active steering system with variable ratio and rear-wheel steer capability', requiresHardware: true, warning: 'Requires complete active steering hardware', defaultEnabled: false },
  { code: '2MD', name: 'M Sport Steering', category: 'steering', description: 'M Sport steering rack with heavier feel and faster ratio', requiresHardware: true, defaultEnabled: false },
  { code: '2PA', name: 'Steering Wheel Paddles', category: 'steering', description: 'Steering wheel-mounted paddle shifters for automatic transmissions', requiresHardware: true, defaultEnabled: false },
  // Engine
  { code: '840', name: 'Speed Limit Increase', category: 'engine', description: 'Increase electronic top speed limiter', requiresHardware: false, defaultEnabled: false },
  { code: '9AA', name: 'Outer Skin Protection', category: 'engine', description: 'Engine outer skin protection and heat shielding', requiresHardware: false, defaultEnabled: false },
  { code: '1CA', name: 'CO2 Emission Selection', category: 'engine', description: 'CO2 emission level configuration', requiresHardware: false, defaultEnabled: true },
  // Transmission
  { code: '2TC', name: 'Sport Automatic', category: 'transmission', description: 'Sport automatic transmission with faster shifts', requiresHardware: true, defaultEnabled: false },
  { code: '205', name: 'Steptronic', category: 'transmission', description: 'Steptronic manual mode for automatic transmission', requiresHardware: true, defaultEnabled: true },
  { code: '2TB', name: 'Sport Drivelogic', category: 'transmission', description: 'Sport drivelogic with adjustable shift firmness (SMG/DCT)', requiresHardware: true, defaultEnabled: false },
  // Safety
  { code: '5AD', name: 'Active Cruise Control', category: 'safety', description: 'Active/adaptive cruise control with distance maintenance', requiresHardware: true, defaultEnabled: false },
  { code: '5AC', name: 'High Beam Assistant', category: 'safety', description: 'Automatic high beam on/off with oncoming detection', requiresHardware: true, defaultEnabled: false },
  { code: '5AG', name: 'Active Blind Spot Detection', category: 'safety', description: 'Blind spot monitoring with vibration warning', requiresHardware: true, defaultEnabled: false },
  { code: '5AS', name: 'Active Driving Assistant', category: 'safety', description: 'Lane departure warning and collision preparation', requiresHardware: true, defaultEnabled: false },
  { code: '1AB', name: 'EU4 Emissions Standard', category: 'safety', description: 'EU4 emissions compliance coding', requiresHardware: false, defaultEnabled: true },
  // Comfort
  { code: '4A4', name: 'Climate Control Zones', category: 'comfort', description: 'Multi-zone automatic climate control (IHKA)', requiresHardware: true, defaultEnabled: true },
  { code: '4NB', name: 'Digital Audio Broadcasting', category: 'comfort', description: 'DAB digital radio reception', requiresHardware: true, defaultEnabled: false },
  { code: '6AA', name: 'BMW TeleServices', category: 'comfort', description: 'BMW TeleServices for remote diagnostics', requiresHardware: true, defaultEnabled: false },
  { code: '6AB', name: 'BMW Assist', category: 'comfort', description: 'BMW Assist emergency call system', requiresHardware: true, defaultEnabled: false },
  { code: '6NF', name: 'Smartphone Integration', category: 'comfort', description: 'Extended smartphone integration via Bluetooth', requiresHardware: true, defaultEnabled: false },
  // Lighting
  { code: '524', name: 'Adaptive Headlights', category: 'lighting', description: 'Adaptive xenon headlights that swivel with steering', requiresHardware: true, defaultEnabled: false },
  { code: '522', name: 'Xenon Headlights', category: 'lighting', description: 'Xenon HID headlight system', requiresHardware: true, defaultEnabled: false },
  { code: '521', name: 'Rain/Light Sensor', category: 'lighting', description: 'Automatic rain sensing wipers and light sensor', requiresHardware: true, defaultEnabled: false },
  { code: '563', name: 'LED Fog Lights', category: 'lighting', description: 'LED fog light upgrade', requiresHardware: true, defaultEnabled: false },
  // Electronic
  { code: '6VC', name: 'Combox Media', category: 'electronic', description: 'Combox media with enhanced Bluetooth audio', requiresHardware: true, defaultEnabled: false },
  { code: '6NR', name: 'Apps/ConnectedDrive', category: 'electronic', description: 'BMW Apps and ConnectedDrive services', requiresHardware: true, defaultEnabled: false },
  { code: '6NS', name: 'Remote Services', category: 'electronic', description: 'Remote lock/unlock and climate start via app', requiresHardware: true, defaultEnabled: false },
  { code: '6UH', name: 'Traffic Info', category: 'electronic', description: 'Real-time traffic information display', requiresHardware: false, defaultEnabled: false },
  // Body
  { code: '302', name: 'Alarm System', category: 'body', description: 'Vehicle alarm system with interior monitoring', requiresHardware: true, defaultEnabled: false },
  { code: '316', name: 'Sunroof', category: 'body', description: 'Electric glass sunroof', requiresHardware: true, defaultEnabled: false },
  { code: '320', name: 'Delete Model Badge', category: 'body', description: 'Remove exterior model designation', requiresHardware: false, defaultEnabled: false },
  { code: '431', name: 'Interior Mirror Auto-dim', category: 'body', description: 'Auto-dimming interior rear view mirror', requiresHardware: true, defaultEnabled: false },
  { code: '459', name: 'Power Seat Memory', category: 'body', description: 'Power seats with memory function', requiresHardware: true, defaultEnabled: false },
  { code: '488', name: 'Lumbar Support', category: 'body', description: 'Power lumbar support for front seats', requiresHardware: true, defaultEnabled: false },
];

export const CATEGORIES: { id: VOOption['category']; name: string; icon: string }[] = [
  { id: 'steering', name: 'Steering', icon: 'Navigation' },
  { id: 'engine', name: 'Engine', icon: 'Zap' },
  { id: 'transmission', name: 'Transmission', icon: 'Cog' },
  { id: 'safety', name: 'Safety', icon: 'Shield' },
  { id: 'comfort', name: 'Comfort', icon: 'Armchair' },
  { id: 'lighting', name: 'Lighting', icon: 'Lightbulb' },
  { id: 'electronic', name: 'Electronics', icon: 'Monitor' },
  { id: 'body', name: 'Body/Interior', icon: 'Car' },
];

export interface VOProfile {
  options: string[];
  baseFA: string;
  vin: string;
  date: string;
}

export function buildNCSString(vo: VOProfile): string {
  const parts: string[] = [];
  parts.push(`BASEFA = ${vo.baseFA};`);
  parts.push(`VIN = ${vo.vin};`);
  parts.push(`DATE = ${vo.date};`);
  parts.push('OPTIONS = {');
  vo.options.forEach(opt => {
    const option = VO_OPTIONS.find(o => o.code === opt);
    parts.push(`  ${opt} ; ${option?.name || 'Unknown'}`);
  });
  parts.push('};');
  return parts.join('\n');
}

export function validateVOCombination(options: string[]): string[] {
  const warnings: string[] = [];
  // AFS requires specific chassis preparation
  if (options.includes('2VB') && !options.includes('2VH')) {
    warnings.push('AFS (2VB) works best with Active Steering (2VH) — consider adding both');
  }
  if (options.includes('2VH') && !options.includes('2VB')) {
    warnings.push('Active Steering (2VH) includes AFS functionality');
  }
  if (options.includes('5AG') && !options.includes('5AS')) {
    warnings.push('Blind Spot Detection (5AG) requires Active Driving Assistant (5AS)');
  }
  if (options.includes('2PA') && !options.includes('205')) {
    warnings.push('Paddle shifters (2PA) require Steptronic (205)');
  }
  return warnings;
}
