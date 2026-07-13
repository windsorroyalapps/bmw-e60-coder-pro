// BMW E60 Coder Pro - AI Tuning Engine
// Generates optimized performance maps and provides intelligent tuning recommendations

import type {
  EngineType, MapType, InjectorType, PerformanceMap,
  TimingTable, FuelTable, BoostTable, ThrottleMap,
  AiTuneRecommendation, LiveData, VehicleProfile
} from '@/types';
import { ENGINE_SPECS, INJECTOR_DATABASE, calculateMaxHp } from './engineData';

export class AITuningEngine {
  private static instance: AITuningEngine;

  static getInstance(): AITuningEngine {
    if (!AITuningEngine.instance) {
      AITuningEngine.instance = new AITuningEngine();
    }
    return AITuningEngine.instance;
  }

  /**
   * Generate a complete performance map using AI optimization
   */
  generateMap(
    engine: EngineType,
    mapType: MapType,
    injector: InjectorType,
    profile?: VehicleProfile
  ): PerformanceMap {
    const engineSpec = ENGINE_SPECS[engine];
    const isTurbo = engineSpec.aspiration === 'twin_turbo' || engineSpec.aspiration === 'single_turbo';
    const isDiesel = engineSpec.fuelType === 'diesel';
    
    // Base map configuration
    const mapConfig = this.getMapConfiguration(mapType, engine);
    
    // Generate timing tables
    const timing = this.generateTimingTables(engine, mapType, injector);
    
    // Generate fuel tables
    const fuel = this.generateFuelTables(engine, mapType, injector, isDiesel);
    
    // Generate boost tables (turbo only)
    const boost = isTurbo ? this.generateBoostTables(engine, mapType, injector, profile) : undefined;
    
    // Generate throttle map
    const throttle = this.generateThrottleMap(mapType, engine);
    
    // Generate VANOS tables
    const vanosIntake = this.generateVanosIntake(engine, mapType);
    const vanosExhaust = this.generateVanosExhaust(engine, mapType);
    
    // Calculate safety score
    const safetyScore = this.calculateSafetyScore(engine, mapType, injector, profile);
    
    return {
      id: mapType,
      name: mapConfig.name,
      description: mapConfig.description,
      color: mapConfig.color,
      engine,
      injector,
      timing,
      fuel,
      boost,
      throttle,
      vanosIntake,
      vanosExhaust,
      valvetronicRange: this.getValvetronicRange(mapType),
      revLimit: mapConfig.revLimit,
      launchControlRpm: mapConfig.launchControlRpm,
      warmStartEnrichment: mapConfig.warmStartEnrichment,
      fuelCutEnabled: mapConfig.fuelCutEnabled,
      softCutRpm: mapConfig.softCutRpm,
      hardCutRpm: mapConfig.hardCutRpm,
      coolingFanSpeed: mapConfig.coolingFanSpeed,
      speedLimit: mapConfig.speedLimit,
      gearBasedBoost: isTurbo ? this.generateGearBasedBoost(mapType) : undefined,
      aiGenerated: true,
      safetyScore,
    };
  }

  /**
   * Analyze live data and generate tuning recommendations
   */
  analyzeLiveData(data: LiveData, profile: VehicleProfile, _currentMap: PerformanceMap): AiTuneRecommendation[] {
    const recommendations: AiTuneRecommendation[] = [];
    const engineSpec = ENGINE_SPECS[profile.engine];

    // Knock detection analysis
    if (data.knock > 3) {
      recommendations.push({
        id: `knock_${Date.now()}`,
        type: 'timing',
        severity: data.knock > 5 ? 'critical' : 'warning',
        message: `Knock detected: ${data.knock} counts. Retarding timing recommended.`,
        parameter: 'ignition_advance',
        currentValue: data.timing,
        recommendedValue: data.timing - (data.knock * 0.5),
        reason: `Knock sensor reporting ${data.knock} counts at ${data.rpm} RPM, ${data.load}% load. Reducing timing by ${(data.knock * 0.5).toFixed(1)} degrees to prevent engine damage.`,
        confidence: 95,
        autoApplicable: data.knock > 5,
      });
    }

    // AFR analysis
    const targetAfr = profile.engine === 'm57' ? 1.25 : 0.85; // diesel vs gasoline lambda
    const afrDeviation = Math.abs(data.afr - targetAfr);
    
    if (data.load > 60 && afrDeviation > 0.1) {
      const isLean = data.afr > targetAfr;
      recommendations.push({
        id: `afr_${Date.now()}`,
        type: 'fuel',
        severity: isLean ? 'critical' : 'suggestion',
        message: isLean 
          ? `Lean condition detected: lambda ${data.afr.toFixed(2)}. Enriching fuel.` 
          : `Rich condition: lambda ${data.afr.toFixed(2)}. Consider leaning fuel.`,
        parameter: 'fuel_correction',
        currentValue: data.afr,
        recommendedValue: targetAfr,
        reason: `At ${data.rpm} RPM, ${data.load}% load, lambda is ${data.afr.toFixed(2)} (target: ${targetAfr}). ${isLean ? 'Lean conditions can cause detonation.' : 'Rich conditions waste fuel and reduce power.'}`,
        confidence: 88,
        autoApplicable: isLean,
      });
    }

    // Boost analysis (turbo engines)
    if (engineSpec.stockBoost && data.boost > 0) {
      const maxSafeBoost = profile.hasUpgradedTurbo ? engineSpec.maxSafeBoost! * 1.3 : engineSpec.maxSafeBoost!;
      
      if (data.boost > maxSafeBoost!) {
        recommendations.push({
          id: `boost_${Date.now()}`,
          type: 'boost',
          severity: 'critical',
          message: `Overboost: ${data.boost.toFixed(2)} bar exceeds safe limit of ${maxSafeBoost!.toFixed(2)} bar.`,
          parameter: 'wastegate_duty',
          currentValue: data.boost,
          recommendedValue: maxSafeBoost! * 0.95,
          reason: `Boost pressure of ${data.boost.toFixed(2)} bar exceeds safe hardware limit. Reducing wastegate duty to lower boost.`,
          confidence: 98,
          autoApplicable: true,
        });
      }

      // Boost taper recommendation
      if (data.rpm > 5500 && data.boost > engineSpec.stockBoost * 1.5) {
        recommendations.push({
          id: `boost_taper_${Date.now()}`,
          type: 'boost',
          severity: 'suggestion',
          message: 'High boost at high RPM may strain turbo. Recommend taper.',
          parameter: 'boost_taper',
          currentValue: data.boost,
          recommendedValue: data.boost * 0.9,
          reason: `Sustained high boost at ${data.rpm} RPM increases turbine inlet temperature to ${data.turbineInlet}C. Tapering boost extends turbo life.`,
          confidence: 75,
          autoApplicable: false,
        });
      }
    }

    // IAT analysis
    if (data.iat > 55) {
      recommendations.push({
        id: `iat_${Date.now()}`,
        type: 'safety',
        severity: data.iat > 65 ? 'warning' : 'suggestion',
        message: `High IAT: ${data.iat}C. Power reduced to prevent knock.`,
        parameter: 'timing_retard',
        currentValue: data.iat,
        recommendedValue: 45,
        reason: `Intake air temperature of ${data.iat}C increases knock tendency. ${!profile.hasUpgradedIntercooler ? 'Upgraded intercooler recommended.' : 'Consider meth injection for cooling.'}`,
        confidence: 82,
        autoApplicable: false,
      });
    }

    // Oil temperature
    if (data.oilTemp > 130) {
      recommendations.push({
        id: `oil_temp_${Date.now()}`,
        type: 'safety',
        severity: 'critical',
        message: `Critical oil temp: ${data.oilTemp}C. Reduce load immediately.`,
        parameter: 'engine_protection',
        currentValue: data.oilTemp,
        recommendedValue: 120,
        reason: `Oil temperature ${data.oilTemp}C exceeds safe operating range. Oil film strength compromised. Reduce load or add oil cooler.`,
        confidence: 99,
        autoApplicable: true,
      });
    }

    // Fuel trim analysis
    if (Math.abs(data.fuelTrimLong) > 10) {
      recommendations.push({
        id: `fuel_trim_${Date.now()}`,
        type: 'fuel',
        severity: Math.abs(data.fuelTrimLong) > 15 ? 'warning' : 'suggestion',
        message: `Fuel trim ${data.fuelTrimLong > 0 ? 'adding' : 'removing'} ${Math.abs(data.fuelTrimLong)}%. Base map calibration needed.`,
        parameter: 'fuel_correction_base',
        currentValue: data.fuelTrimLong,
        recommendedValue: 0,
        reason: `Long-term fuel trim at ${data.fuelTrimLong}% indicates base map mismatch with injector scaling. ${data.fuelTrimLong > 0 ? 'Enriching base map or reduce injector scalar.' : 'Lean base map or increase injector scalar.'}`,
        confidence: 85,
        autoApplicable: false,
      });
    }

    // Duty cycle analysis
    if (data.dutyCycle > 90) {
      recommendations.push({
        id: `duty_cycle_${Date.now()}`,
        type: 'fuel',
        severity: data.dutyCycle > 95 ? 'critical' : 'warning',
        message: `Injector duty cycle at ${data.dutyCycle}%. Injectors near max capacity.`,
        parameter: 'fuel_pressure',
        currentValue: data.dutyCycle,
        recommendedValue: 85,
        reason: `Duty cycle of ${data.dutyCycle}% leaves no headroom. Risk of lean condition under transient load. Upgrade injectors or increase fuel pressure.`,
        confidence: 92,
        autoApplicable: false,
      });
    }

    // Torque analysis
    if (data.tqActual > data.tqRequested * 1.1) {
      recommendations.push({
        id: `tq_overshoot_${Date.now()}`,
        type: 'safety',
        severity: 'warning',
        message: `Torque overshoot: ${data.tqActual} vs requested ${data.tqRequested} Nm.`,
        parameter: 'tq_limiter',
        currentValue: data.tqActual,
        recommendedValue: data.tqRequested,
        reason: `Actual torque exceeds requested by ${((data.tqActual / data.tqRequested - 1) * 100).toFixed(1)}%. May indicate boost control issue or clutch slip.`,
        confidence: 78,
        autoApplicable: false,
      });
    }

    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, suggestion: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generate timing tables optimized for the specific engine and map
   */
  private generateTimingTables(engine: EngineType, mapType: MapType, _injector: InjectorType): TimingTable[] {
    const tables: TimingTable[] = [];
    const spec = ENGINE_SPECS[engine];
    const isTurbo = spec.aspiration === 'twin_turbo' || spec.aspiration === 'single_turbo';
    const isDiesel = spec.fuelType === 'diesel';

    // Map-specific base timing adjustments
    const timingOffsets: Record<MapType, number> = {
      stock: 0,
      stage1: 2,
      stage2: 4,
      stage2plus: 6,
      stage3: 8,
      custom: 4,
      economy: -2,
      valet: -8,
      anti_theft: -15,
    };

    const baseOffset = timingOffsets[mapType] || 0;

    // RPM breakpoints
    const rpms = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];
    
    // Load breakpoints
    const loads = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const rpm of rpms) {
      for (const load of loads) {
        let baseTiming: number;

        if (isDiesel) {
          // Diesel timing (compression ignition, much more advance)
          baseTiming = 5 + (load * 0.1) + (rpm * 0.001);
        } else if (isTurbo) {
          // Turbo gasoline timing with load-based retard
          baseTiming = 15 + baseOffset;
          if (load > 50) baseTiming -= (load - 50) * 0.15;
          if (rpm > 5000) baseTiming += 2;
        } else {
          // NA gasoline timing
          baseTiming = 18 + baseOffset + (load * 0.05);
          if (rpm > 4500) baseTiming += 3;
        }

        // VANOS interaction simulation
        if (spec.hasVanos && rpm > 3000) {
          baseTiming += 2;
        }

        // Conservative safe values
        const safeTiming = baseTiming - 3;
        
        // Knock retard estimate (higher at high load + boost)
        let knockEstimate = 0;
        if (isTurbo && load > 80) knockEstimate = 1;
        if (load > 90 && rpm > 5500) knockEstimate = 2;

        tables.push({
          rpm,
          loadPercent: load,
          ignitionAdvance: Math.max(0, Math.round(baseTiming * 10) / 10),
          knockRetard: knockEstimate,
          optimal: Math.max(0, Math.round((baseTiming + 1) * 10) / 10),
          safe: Math.max(0, Math.round(safeTiming * 10) / 10),
        });
      }
    }

    return tables;
  }

  /**
   * Generate fuel tables optimized for the engine and injectors
   */
  private generateFuelTables(engine: EngineType, mapType: MapType, _injector: InjectorType, isDiesel: boolean): FuelTable[] {
    const tables: FuelTable[] = [];
    const spec = ENGINE_SPECS[engine];
    const injectorSpec = INJECTOR_DATABASE[_injector];
    const flowRatio = injectorSpec.flowRateCc / spec.injectorSizeCc;

    const lambdaTargets: Record<MapType, number> = {
      stock: isDiesel ? 1.3 : 1.0,
      stage1: isDiesel ? 1.25 : 0.88,
      stage2: isDiesel ? 1.2 : 0.85,
      stage2plus: isDiesel ? 1.15 : 0.82,
      stage3: isDiesel ? 1.1 : 0.80,
      custom: isDiesel ? 1.2 : 0.85,
      economy: isDiesel ? 1.4 : 1.05,
      valet: isDiesel ? 1.3 : 1.0,
      anti_theft: isDiesel ? 1.5 : 1.2,
    };

    const targetLambda = lambdaTargets[mapType] || 1.0;

    const rpms = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];
    const loads = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const rpm of rpms) {
      for (const load of loads) {
        // Adjust lambda based on conditions
        let adjustedLambda = targetLambda;
        
        // Enrich at high load
        if (load > 85) adjustedLambda -= 0.05;
        if (load > 95) adjustedLambda -= 0.03;
        
        // Slightly lean at cruise for economy
        if (load < 30 && mapType === 'economy') adjustedLambda += 0.05;
        
        // Enrich at cold start (simulated by RPM)
        if (rpm < 1500) adjustedLambda -= 0.03;

        // Calculate pulse width based on injector size and flow
        const basePulse = 2.0 * (load / 100) * (spec.injectorSizeCc / injectorSpec.flowRateCc);
        const pulseWidth = Math.max(1.0, basePulse * (1 / flowRatio));

        tables.push({
          rpm,
          loadPercent: load,
          lambdaTarget: Math.round(adjustedLambda * 100) / 100,
          fuelCorrection: Math.round((1 - flowRatio) * 100),
          injectorPulseMs: Math.round(pulseWidth * 100) / 100,
        });
      }
    }

    return tables;
  }

  /**
   * Generate boost tables for turbo engines
   */
  private generateBoostTables(engine: EngineType, mapType: MapType, _injector: InjectorType, profile?: VehicleProfile): BoostTable[] {
    const tables: BoostTable[] = [];
    const spec = ENGINE_SPECS[engine];
    const isTurbo = spec.aspiration === 'twin_turbo' || spec.aspiration === 'single_turbo';
    
    if (!isTurbo || !spec.stockBoost) return tables;

    // Map-specific boost multipliers
    const boostMultipliers: Record<MapType, number> = {
      stock: 1.0,
      stage1: 1.3,
      stage2: 1.6,
      stage2plus: 1.9,
      stage3: 2.2,
      custom: 1.5,
      economy: 0.85,
      valet: 0.5,
      anti_theft: 0.3,
    };

    const multiplier = boostMultipliers[mapType] || 1.0;
    const hasUpgrades = profile?.hasUpgradedTurbo || profile?.hasUpgradedChargepipe;
    const maxBoost = hasUpgrades ? spec.maxSafeBoost! * 1.2 : spec.maxSafeBoost!;

    const rpms = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

    for (const rpm of rpms) {
      let targetBoost = spec.stockBoost! * multiplier;
      
      // Boost by RPM (spool + taper)
      if (rpm < 2500) {
        targetBoost *= 0.6; // Partial boost during spool
      } else if (rpm > 5500) {
        // Taper at high RPM for turbo health
        const taperFactor = Math.max(0.7, 1 - ((rpm - 5500) / 1500) * 0.3);
        targetBoost *= taperFactor;
      }

      // Cap at safe limit
      targetBoost = Math.min(targetBoost, maxBoost!);

      // Wastegate duty calculation
      const wgDuty = Math.min(95, 30 + (targetBoost / spec.stockBoost!) * 30);

      tables.push({
        rpm,
        targetBoost: Math.round(targetBoost * 100) / 100,
        wastegateDuty: Math.round(wgDuty),
        taperStartRpm: 5500,
        taperEndRpm: 7000,
        overboost: Math.round((targetBoost * 1.1) * 100) / 100,
      });
    }

    return tables;
  }

  /**
   * Generate throttle map for different drive modes
   */
  private generateThrottleMap(mapType: MapType, engine: EngineType): ThrottleMap[] {
    const maps: ThrottleMap[] = [];
    const spec = ENGINE_SPECS[engine];

    const configs: Record<MapType, { mode: 'linear' | 'aggressive' | 'custom' | 'valet'; aggressiveness: number }> = {
      stock: { mode: 'linear', aggressiveness: 1.0 },
      stage1: { mode: 'aggressive', aggressiveness: 1.15 },
      stage2: { mode: 'aggressive', aggressiveness: 1.3 },
      stage2plus: { mode: 'aggressive', aggressiveness: 1.4 },
      stage3: { mode: 'aggressive', aggressiveness: 1.5 },
      custom: { mode: 'custom', aggressiveness: 1.2 },
      economy: { mode: 'linear', aggressiveness: 0.85 },
      valet: { mode: 'valet', aggressiveness: 0.4 },
      anti_theft: { mode: 'valet', aggressiveness: 0.1 },
    };

    const config = configs[mapType];

    for (let pedal = 0; pedal <= 100; pedal += 5) {
      let throttle: number;

      switch (config.mode) {
        case 'linear':
          throttle = pedal * config.aggressiveness;
          break;
        case 'aggressive':
          // Exponential curve for aggressive response
          throttle = Math.pow(pedal / 100, 0.6) * 100 * config.aggressiveness;
          break;
        case 'valet':
          throttle = pedal * config.aggressiveness;
          break;
        case 'custom':
        default:
          // S-curve
          if (pedal < 20) {
            throttle = pedal * 0.8 * config.aggressiveness;
          } else if (pedal < 60) {
            throttle = (16 + (pedal - 20) * 1.2) * config.aggressiveness;
          } else {
            throttle = (64 + (pedal - 60) * 0.9) * config.aggressiveness;
          }
          break;
      }

      // Cap at 100 for non-turbo, allow slightly over for turbo (valvetronic trick)
      if (spec.aspiration !== 'twin_turbo') {
        throttle = Math.min(100, throttle);
      } else if (mapType !== 'stock' && mapType !== 'economy') {
        throttle = Math.min(105, throttle);
      }

      maps.push({
        pedalPercent: pedal,
        throttlePercent: Math.round(Math.max(0, throttle)),
        mode: config.mode,
      });
    }

    return maps;
  }

  /**
   * Generate VANOS intake cam advance table
   */
  private generateVanosIntake(engine: EngineType, mapType: MapType): { rpm: number; advance: number }[] {
    const spec = ENGINE_SPECS[engine];
    if (!spec.hasVanos) return [];

    const isAggressive = ['stage2', 'stage2plus', 'stage3', 'track'].includes(mapType);
    const rpms = [1000, 2000, 3000, 4000, 5000, 6000, 7000];

    return rpms.map(rpm => {
      let advance: number;
      if (rpm < 2000) advance = 5;
      else if (rpm < 3500) advance = isAggressive ? 25 : 20;
      else if (rpm < 5000) advance = isAggressive ? 40 : 35;
      else advance = isAggressive ? 30 : 25;
      return { rpm, advance };
    });
  }

  /**
   * Generate VANOS exhaust cam advance table
   */
  private generateVanosExhaust(engine: EngineType, mapType: MapType): { rpm: number; advance: number }[] {
    const spec = ENGINE_SPECS[engine];
    if (!spec.hasVanos) return [];

    const isAggressive = ['stage2', 'stage2plus', 'stage3', 'track'].includes(mapType);
    const rpms = [1000, 2000, 3000, 4000, 5000, 6000, 7000];

    return rpms.map(rpm => {
      let advance: number;
      if (rpm < 2000) advance = -5;
      else if (rpm < 3500) advance = isAggressive ? -15 : -10;
      else if (rpm < 5000) advance = isAggressive ? -10 : -5;
      else advance = isAggressive ? -5 : 0;
      return { rpm, advance };
    });
  }

  /**
   * Get valvetronic lift range
   */
  private getValvetronicRange(mapType: MapType): { min: number; max: number } {
    const ranges: Record<MapType, { min: number; max: number }> = {
      stock: { min: 0.3, max: 9.7 },
      stage1: { min: 0.3, max: 9.9 },
      stage2: { min: 0.3, max: 10.0 },
      stage2plus: { min: 0.3, max: 10.0 },
      stage3: { min: 0.3, max: 10.0 },
      custom: { min: 0.3, max: 9.8 },
      economy: { min: 0.3, max: 9.5 },
      valet: { min: 0.3, max: 6.0 },
      anti_theft: { min: 0.3, max: 2.0 },
    };
    return ranges[mapType] || { min: 0.3, max: 9.7 };
  }

  /**
   * Get map configuration
   */
  private getMapConfiguration(mapType: MapType, engine: EngineType): {
    name: string; description: string; color: string; revLimit: number;
    launchControlRpm: number; warmStartEnrichment: number; fuelCutEnabled: boolean;
    softCutRpm: number; hardCutRpm: number; coolingFanSpeed: 'low' | 'high' | 'auto'; speedLimit?: number;
  } {
    const spec = ENGINE_SPECS[engine];
    const configs: Record<MapType, any> = {
      stock: {
        name: 'Stock', description: 'Factory BMW calibration', color: '#4CAF50',
        revLimit: spec.revLimit, launchControlRpm: 0, warmStartEnrichment: 1.2,
        fuelCutEnabled: true, softCutRpm: spec.revLimit - 200, hardCutRpm: spec.revLimit + 100,
        coolingFanSpeed: 'auto',
      },
      stage1: {
        name: 'Stage 1', description: 'Optimized stock hardware', color: '#2196F3',
        revLimit: spec.revLimit + 200, launchControlRpm: spec.redline - 500, warmStartEnrichment: 1.15,
        fuelCutEnabled: true, softCutRpm: spec.revLimit, hardCutRpm: spec.revLimit + 300,
        coolingFanSpeed: 'auto',
      },
      stage2: {
        name: 'Stage 2', description: 'Bolt-on upgrades required', color: '#FF9800',
        revLimit: spec.revLimit + 400, launchControlRpm: spec.redline - 300, warmStartEnrichment: 1.2,
        fuelCutEnabled: true, softCutRpm: spec.revLimit + 200, hardCutRpm: spec.revLimit + 500,
        coolingFanSpeed: 'high',
      },
      stage2plus: {
        name: 'Stage 2+', description: 'Upgraded turbos / fuel', color: '#FF5722',
        revLimit: spec.revLimit + 600, launchControlRpm: spec.redline - 200, warmStartEnrichment: 1.25,
        fuelCutEnabled: true, softCutRpm: spec.revLimit + 400, hardCutRpm: spec.revLimit + 700,
        coolingFanSpeed: 'high',
      },
      stage3: {
        name: 'Stage 3', description: 'Full bolt-ons + big turbo', color: '#F44336',
        revLimit: spec.revLimit + 800, launchControlRpm: spec.redline, warmStartEnrichment: 1.3,
        fuelCutEnabled: true, softCutRpm: spec.revLimit + 500, hardCutRpm: spec.revLimit + 900,
        coolingFanSpeed: 'high',
      },
      custom: {
        name: 'Custom', description: 'User-defined configuration', color: '#9C27B0',
        revLimit: spec.revLimit + 200, launchControlRpm: spec.redline - 400, warmStartEnrichment: 1.2,
        fuelCutEnabled: true, softCutRpm: spec.revLimit, hardCutRpm: spec.revLimit + 300,
        coolingFanSpeed: 'auto',
      },
      economy: {
        name: 'Economy', description: 'Maximum fuel efficiency', color: '#009688',
        revLimit: spec.revLimit - 500, launchControlRpm: 0, warmStartEnrichment: 1.1,
        fuelCutEnabled: true, softCutRpm: spec.revLimit - 700, hardCutRpm: spec.revLimit - 400,
        coolingFanSpeed: 'low',
      },
      valet: {
        name: 'Valet', description: 'Reduced power mode', color: '#607D8B',
        revLimit: 4000, launchControlRpm: 0, warmStartEnrichment: 1.0,
        fuelCutEnabled: true, softCutRpm: 3800, hardCutRpm: 4200,
        coolingFanSpeed: 'low', speedLimit: 80,
      },
      anti_theft: {
        name: 'Anti-Theft', description: 'Engine disabled', color: '#000000',
        revLimit: 1000, launchControlRpm: 0, warmStartEnrichment: 1.0,
        fuelCutEnabled: true, softCutRpm: 800, hardCutRpm: 1200,
        coolingFanSpeed: 'low', speedLimit: 10,
      },
    };

    return configs[mapType] || configs.stock;
  }

  /**
   * Generate gear-based boost (for turbo builds)
   */
  private generateGearBasedBoost(mapType: MapType): { gear: number; boost: number }[] {
    const boostLevels: Record<MapType, number[]> = {
      stock: [0.5, 0.5, 0.55, 0.55, 0.5, 0.45],
      stage1: [0.7, 0.7, 0.8, 0.8, 0.75, 0.65],
      stage2: [0.9, 0.9, 1.0, 1.0, 0.95, 0.85],
      stage2plus: [1.1, 1.1, 1.2, 1.2, 1.15, 1.0],
      stage3: [1.3, 1.3, 1.5, 1.5, 1.4, 1.2],
      custom: [0.8, 0.8, 0.9, 0.9, 0.85, 0.75],
      economy: [0.4, 0.4, 0.45, 0.45, 0.4, 0.35],
      valet: [0.2, 0.2, 0.2, 0.2, 0.15, 0.1],
      anti_theft: [0, 0, 0, 0, 0, 0],
    };

    const boosts = boostLevels[mapType] || boostLevels.stock;
    return boosts.map((boost, i) => ({ gear: i + 1, boost }));
  }

  /**
   * Calculate safety score for the map configuration
   */
  private calculateSafetyScore(engine: EngineType, mapType: MapType, injector: InjectorType, profile?: VehicleProfile): number {
    let score = 100;
    const spec = ENGINE_SPECS[engine];
    const injectorSpec = INJECTOR_DATABASE[injector];

    // Map type risk
    const mapRisk: Record<MapType, number> = {
      stock: 0, stage1: -5, stage2: -15, stage2plus: -25, stage3: -35,
      custom: -10, economy: 0, valet: 0, anti_theft: 0,
    };
    score += mapRisk[mapType] || 0;

    // Injector adequacy
    const estimatedHp = this.estimateMapHp(engine, mapType);
    const maxHpForInjector = calculateMaxHp(injectorSpec.flowRateCc, 85, spec.cylinders, spec.fuelType);
    if (estimatedHp > maxHpForInjector * 0.95) score -= 15;
    else if (estimatedHp > maxHpForInjector * 0.85) score -= 5;

    // Hardware check
    if (mapType === 'stage2' || mapType === 'stage2plus' || mapType === 'stage3') {
      if (!profile?.hasUpgradedIntercooler) score -= 10;
      if (!profile?.hasUpgradedChargepipe && engine === 'n54') score -= 5;
      if ((mapType === 'stage2plus' || mapType === 'stage3') && !profile?.hasUpgradedTurbo) score -= 20;
      if ((mapType === 'stage3') && !profile?.hasUpgradedFuelPump) score -= 15;
      if ((mapType === 'stage2plus' || mapType === 'stage3') && !profile?.hasUpgradedClutch) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate horsepower for a given map
   */
  estimateMapHp(engine: EngineType, mapType: MapType): number {
    const spec = ENGINE_SPECS[engine];
    const multipliers: Record<MapType, number> = {
      stock: 1.0, stage1: 1.15, stage2: 1.35, stage2plus: 1.6, stage3: 2.0,
      custom: 1.2, economy: 0.95, valet: 0.4, anti_theft: 0.05,
    };
    return Math.round(spec.stockPower * (multipliers[mapType] || 1.0));
  }

  /**
   * Estimate torque for a given map
   */
  estimateMapTorque(engine: EngineType, mapType: MapType): number {
    const spec = ENGINE_SPECS[engine];
    const multipliers: Record<MapType, number> = {
      stock: 1.0, stage1: 1.2, stage2: 1.45, stage2plus: 1.7, stage3: 2.1,
      custom: 1.25, economy: 0.95, valet: 0.4, anti_theft: 0.05,
    };
    return Math.round(spec.stockTorque * (multipliers[mapType] || 1.0));
  }
}

export const aiTuningEngine = AITuningEngine.getInstance();
