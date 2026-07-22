import { OBD2Bridge } from './nativeBridge';
import { VOProfile } from './voEditor';

export interface CodingResult {
  success: boolean;
  message: string;
}

/**
 * CodingService handles permanent vehicle coding (SG_CODIEREN) and FA (Vehicle Order) writing.
 * It interacts with the native OBD2Bridge to communicate with the vehicle modules.
 */
export class CodingService {
  /**
   * Reads the current FA (Vehicle Order) from CAS and NFRM modules.
   */
  static async readVehicleOrder(): Promise<{ success: boolean; fa?: string; vin?: string; error?: string }> {
    try {
      const response = await OBD2Bridge.readFA();
      return { success: true, fa: response.fa, vin: response.vin };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * Writes a new VO profile to the vehicle (CAS and NFRM/LMA).
   */
  static async writeVehicleOrder(profile: VOProfile): Promise<CodingResult> {
    try {
      // Build the FA string format expected by the car
      const faString = profile.options.map(opt => `+${opt}`).join('');
      const fullFA = `E60_${profile.date}#${profile.baseFA}*${profile.vin}${faString}`;

      const response = await OBD2Bridge.writeFA({ fa: fullFA });
      if (response.success) {
        return { success: true, message: 'Vehicle Order written successfully to CAS and NFRM.' };
      }
      return { success: false, message: 'Failed to write Vehicle Order.' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }

  /**
   * Performs SG_CODIEREN (Module Coding) for a specific ECU.
   * This resets the ECU to its factory defaults based on the current VO.
   */
  static async codeModule(ecu: string): Promise<CodingResult> {
    try {
      const response = await OBD2Bridge.executeJob({
        ecu,
        job: 'SG_CODIEREN'
      });
      if (response.success) {
        return { success: true, message: `Module ${ecu} coded successfully.` };
      }
      return { success: false, message: `Failed to code module ${ecu}: ${response.response}` };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }

  /**
   * Applies the F10 Steering Wheel Retrofit patch.
   * This codes the SZL and AFS modules with specific overrides.
   */
  static async applyF10WheelPatch(): Promise<CodingResult> {
    try {
      // 1. Code SZL to default (based on updated VO)
      const szlRes = await this.codeModule('SZL');
      if (!szlRes.success) return szlRes;

      // 2. Code AFS to default
      const afsRes = await this.codeModule('AFS');
      if (!afsRes.success) return afsRes;

      // 3. Apply specific F10W communication overrides
      // These are custom parameter writes via UDS/KWP2000
      await OBD2Bridge.writeDMEParameter({ parameter: 'LWS_TIMEOUT_PATCH', value: 1 });
      await OBD2Bridge.writeDMEParameter({ parameter: 'SZL_CAN_ID_MOD', value: 1 });

      return { success: true, message: 'F10 Wheel Retrofit patch applied successfully.' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }
}
