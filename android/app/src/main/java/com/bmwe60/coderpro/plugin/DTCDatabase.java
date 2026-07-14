package com.bmwe60.coderpro.plugin;

import java.util.HashMap;
import java.util.Map;

/**
 * DTCDatabase - Diagnostic Trouble Code descriptions for BMW E60.
 * Covers powertrain (P0xxx, P1xxx), chassis (C0xxx), body (B0xxx), and network (U0xxx) codes.
 */
public class DTCDatabase {

    private static final Map<String, String> DTC_MAP = new HashMap<>();

    static {
        // Engine Misfire
        DTC_MAP.put("P0300", "Random/Multiple Cylinder Misfire Detected");
        DTC_MAP.put("P0301", "Cylinder 1 Misfire Detected");
        DTC_MAP.put("P0302", "Cylinder 2 Misfire Detected");
        DTC_MAP.put("P0303", "Cylinder 3 Misfire Detected");
        DTC_MAP.put("P0304", "Cylinder 4 Misfire Detected");
        DTC_MAP.put("P0305", "Cylinder 5 Misfire Detected");
        DTC_MAP.put("P0306", "Cylinder 6 Misfire Detected");

        // Fuel System
        DTC_MAP.put("P0171", "System Too Lean (Bank 1)");
        DTC_MAP.put("P0172", "System Too Rich (Bank 1)");
        DTC_MAP.put("P0174", "System Too Lean (Bank 2)");
        DTC_MAP.put("P0175", "System Too Rich (Bank 2)");
        DTC_MAP.put("P0087", "Fuel Rail/System Pressure Too Low");
        DTC_MAP.put("P0088", "Fuel Rail/System Pressure Too High");
        DTC_MAP.put("P0090", "Fuel Pressure Regulator 1 Control Circuit");
        DTC_MAP.put("P0190", "Fuel Rail Pressure Sensor Circuit");
        DTC_MAP.put("P0191", "Fuel Rail Pressure Sensor Circuit Range/Performance");
        DTC_MAP.put("P0192", "Fuel Rail Pressure Sensor Circuit Low Input");
        DTC_MAP.put("P0193", "Fuel Rail Pressure Sensor Circuit High Input");

        // Ignition / Timing
        DTC_MAP.put("P0325", "Knock Sensor 1 Circuit");
        DTC_MAP.put("P0326", "Knock Sensor 1 Circuit Range/Performance");
        DTC_MAP.put("P0327", "Knock Sensor 1 Circuit Low Input");
        DTC_MAP.put("P0328", "Knock Sensor 1 Circuit High Input");
        DTC_MAP.put("P0330", "Knock Sensor 2 Circuit");
        DTC_MAP.put("P0332", "Knock Sensor 2 Circuit Low Input");
        DTC_MAP.put("P0333", "Knock Sensor 2 Circuit High Input");
        DTC_MAP.put("P0351", "Ignition Coil A Primary/Secondary Circuit");
        DTC_MAP.put("P0352", "Ignition Coil B Primary/Secondary Circuit");
        DTC_MAP.put("P0353", "Ignition Coil C Primary/Secondary Circuit");
        DTC_MAP.put("P0354", "Ignition Coil D Primary/Secondary Circuit");
        DTC_MAP.put("P0355", "Ignition Coil E Primary/Secondary Circuit");
        DTC_MAP.put("P0356", "Ignition Coil F Primary/Secondary Circuit");
        DTC_MAP.put("P0011", "A Camshaft Position Timing Over-Advanced (Bank 1)");
        DTC_MAP.put("P0012", "A Camshaft Position Timing Over-Retarded (Bank 1)");
        DTC_MAP.put("P0015", "B Camshaft Position Timing Over-Retarded (Bank 1)");
        DTC_MAP.put("P0021", "A Camshaft Position Timing Over-Advanced (Bank 2)");
        DTC_MAP.put("P0022", "A Camshaft Position Timing Over-Retarded (Bank 2)");
        DTC_MAP.put("P0025", "B Camshaft Position Timing Over-Retarded (Bank 2)");

        // Turbo / Boost
        DTC_MAP.put("P0234", "Turbocharger Overboost Condition");
        DTC_MAP.put("P0235", "Turbocharger Boost Sensor A Circuit");
        DTC_MAP.put("P0236", "Turbocharger Boost Sensor A Circuit Range/Performance");
        DTC_MAP.put("P0237", "Turbocharger Boost Sensor A Circuit Low");
        DTC_MAP.put("P0238", "Turbocharger Boost Sensor A Circuit High");
        DTC_MAP.put("P0243", "Turbocharger Wastegate Solenoid A Low");
        DTC_MAP.put("P0244", "Turbocharger Wastegate Solenoid A Intermittent");
        DTC_MAP.put("P0245", "Turbocharger Wastegate Solenoid A Low");
        DTC_MAP.put("P0246", "Turbocharger Wastegate Solenoid A High");
        DTC_MAP.put("P0299", "Turbocharger Underboost Condition");
        DTC_MAP.put("P0298", "Engine Oil Over Temperature");

        // O2 / Lambda Sensors
        DTC_MAP.put("P0130", "O2 Sensor Circuit (Bank 1 Sensor 1)");
        DTC_MAP.put("P0131", "O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)");
        DTC_MAP.put("P0132", "O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)");
        DTC_MAP.put("P0133", "O2 Sensor Slow Response (Bank 1 Sensor 1)");
        DTC_MAP.put("P0134", "O2 Sensor Circuit No Activity (Bank 1 Sensor 1)");
        DTC_MAP.put("P0135", "O2 Sensor Heater Circuit (Bank 1 Sensor 1)");
        DTC_MAP.put("P0150", "O2 Sensor Circuit (Bank 2 Sensor 1)");
        DTC_MAP.put("P0151", "O2 Sensor Circuit Low Voltage (Bank 2 Sensor 1)");
        DTC_MAP.put("P0152", "O2 Sensor Circuit High Voltage (Bank 2 Sensor 1)");
        DTC_MAP.put("P0153", "O2 Sensor Slow Response (Bank 2 Sensor 1)");
        DTC_MAP.put("P0155", "O2 Sensor Heater Circuit (Bank 2 Sensor 1)");
        DTC_MAP.put("P0420", "Catalyst System Efficiency Below Threshold (Bank 1)");
        DTC_MAP.put("P0430", "Catalyst System Efficiency Below Threshold (Bank 2)");

        // VANOS / Valvetronic
        DTC_MAP.put("P0010", "A Camshaft Position Actuator Circuit (Bank 1)");
        DTC_MAP.put("P0013", "B Camshaft Position Actuator Circuit (Bank 1)");
        DTC_MAP.put("P0016", "Crankshaft Position - Camshaft Position Correlation (Bank 1 Sensor A)");
        DTC_MAP.put("P0017", "Crankshaft Position - Camshaft Position Correlation (Bank 1 Sensor B)");
        DTC_MAP.put("P0018", "Crankshaft Position - Camshaft Position Correlation (Bank 2 Sensor A)");
        DTC_MAP.put("P0019", "Crankshaft Position - Camshaft Position Correlation (Bank 2 Sensor B)");
        DTC_MAP.put("P0526", "Fan Speed Sensor Circuit");
        DTC_MAP.put("P1112", "Intake Air Temperature Sensor Circuit Low Input");
        DTC_MAP.put("P1113", "Intake Air Temperature Sensor Circuit High Input");

        // Cooling System
        DTC_MAP.put("P0115", "Engine Coolant Temperature Circuit");
        DTC_MAP.put("P0116", "Engine Coolant Temperature Circuit Range/Performance");
        DTC_MAP.put("P0117", "Engine Coolant Temperature Circuit Low Input");
        DTC_MAP.put("P0118", "Engine Coolant Temperature Circuit High Input");
        DTC_MAP.put("P0119", "Engine Coolant Temperature Circuit Intermittent");
        DTC_MAP.put("P0480", "Fan 1 Control Circuit");
        DTC_MAP.put("P0481", "Fan 2 Control Circuit");
        DTC_MAP.put("P0691", "Fan 1 Control Circuit Low");
        DTC_MAP.put("P0692", "Fan 1 Control Circuit High");
        DTC_MAP.put("P0693", "Fan 2 Control Circuit Low");
        DTC_MAP.put("P0694", "Fan 2 Control Circuit High");

        // Throttle
        DTC_MAP.put("P0120", "Throttle/Pedal Position Sensor Circuit");
        DTC_MAP.put("P0121", "Throttle/Pedal Position Sensor Circuit Range/Performance");
        DTC_MAP.put("P0122", "Throttle/Pedal Position Sensor Circuit Low Input");
        DTC_MAP.put("P0123", "Throttle/Pedal Position Sensor Circuit High Input");
        DTC_MAP.put("P0220", "Throttle/Pedal Position Sensor/Switch B Circuit");
        DTC_MAP.put("P0221", "Throttle/Pedal Position Sensor/Switch B Circuit Range/Performance");
        DTC_MAP.put("P0222", "Throttle/Pedal Position Sensor/Switch B Circuit Low Input");
        DTC_MAP.put("P0223", "Throttle/Pedal Position Sensor/Switch B Circuit High Input");
        DTC_MAP.put("P0638", "Throttle Actuator Control Range/Performance (Bank 1)");
        DTC_MAP.put("P0639", "Throttle Actuator Control Range/Performance (Bank 2)");
        DTC_MAP.put("P1551", "Throttle Idle Air Control Adaptation Not Successful");
        DTC_MAP.put("P1552", "Idle Speed Control Valve Opening Solenoid Control Circuit Signal Low");
        DTC_MAP.put("P1553", "Idle Speed Control Valve Closing Solenoid Control Circuit Signal High");

        // Air Intake / MAF
        DTC_MAP.put("P0100", "Mass or Volume Air Flow Circuit");
        DTC_MAP.put("P0101", "Mass or Volume Air Flow Circuit Range/Performance");
        DTC_MAP.put("P0102", "Mass or Volume Air Flow Circuit Low Input");
        DTC_MAP.put("P0103", "Mass or Volume Air Flow Circuit High Input");
        DTC_MAP.put("P0104", "Mass or Volume Air Flow Circuit Intermittent");
        DTC_MAP.put("P0110", "Intake Air Temperature Circuit");
        DTC_MAP.put("P0111", "Intake Air Temperature Circuit Range/Performance");
        DTC_MAP.put("P0112", "Intake Air Temperature Circuit Low Input");
        DTC_MAP.put("P0113", "Intake Air Temperature Circuit High Input");
        DTC_MAP.put("P1105", "Mass Air Flow Sensor Circuit Intermittent High");
        DTC_MAP.put("P1106", "Mass Air Flow Sensor Circuit Intermittent Low");

        // Crankshaft / Camshaft Position
        DTC_MAP.put("P0335", "Crankshaft Position Sensor Circuit");
        DTC_MAP.put("P0336", "Crankshaft Position Sensor Circuit Range/Performance");
        DTC_MAP.put("P0337", "Crankshaft Position Sensor Circuit Low Input");
        DTC_MAP.put("P0338", "Crankshaft Position Sensor Circuit High Input");
        DTC_MAP.put("P0339", "Crankshaft Position Sensor Circuit Intermittent");
        DTC_MAP.put("P0340", "Camshaft Position Sensor Circuit");
        DTC_MAP.put("P0341", "Camshaft Position Sensor Circuit Range/Performance");
        DTC_MAP.put("P0342", "Camshaft Position Sensor Circuit Low Input");
        DTC_MAP.put("P0343", "Camshaft Position Sensor Circuit High Input");
        DTC_MAP.put("P0344", "Camshaft Position Sensor Circuit Intermittent");

        // Evap / Emissions
        DTC_MAP.put("P0440", "Evaporative Emission System");
        DTC_MAP.put("P0441", "Evaporative Emission System Incorrect Purge Flow");
        DTC_MAP.put("P0442", "Evaporative Emission System Leak Detected (small leak)");
        DTC_MAP.put("P0443", "Evaporative Emission System Purge Control Valve Circuit");
        DTC_MAP.put("P0455", "Evaporative Emission System Leak Detected (gross leak)");
        DTC_MAP.put("P0456", "Evaporative Emission System Leak Detected (very small leak)");
        DTC_MAP.put("P0491", "Secondary Air Injection System Insufficient Flow (Bank 1)");
        DTC_MAP.put("P0492", "Secondary Air Injection System Insufficient Flow (Bank 2)");

        // Transmission (EGS)
        DTC_MAP.put("P0700", "Transmission Control System (MIL Request)");
        DTC_MAP.put("P0705", "Transmission Range Sensor Circuit");
        DTC_MAP.put("P0710", "Transmission Fluid Temperature Sensor Circuit");
        DTC_MAP.put("P0715", "Input/Turbine Speed Sensor Circuit");
        DTC_MAP.put("P0720", "Output Speed Sensor Circuit");
        DTC_MAP.put("P0730", "Incorrect Gear Ratio");
        DTC_MAP.put("P0740", "Torque Converter Clutch Circuit");
        DTC_MAP.put("P0741", "Torque Converter Clutch Circuit Performance or Stuck Off");
        DTC_MAP.put("P0750", "Shift Solenoid A");
        DTC_MAP.put("P0755", "Shift Solenoid B");
        DTC_MAP.put("P0760", "Shift Solenoid C");
        DTC_MAP.put("P0765", "Shift Solenoid D");
        DTC_MAP.put("P0775", "Pressure Control Solenoid B");
        DTC_MAP.put("P0780", "Shift Error");

        // Electrical / Charging
        DTC_MAP.put("P0560", "System Voltage");
        DTC_MAP.put("P0562", "System Voltage Low");
        DTC_MAP.put("P0563", "System Voltage High");
        DTC_MAP.put("P0620", "Generator Control Circuit");
        DTC_MAP.put("P0621", "Generator Lamp L Control Circuit");
        DTC_MAP.put("P0622", "Generator Field F Control Circuit");

        // CAN Bus / Communication
        DTC_MAP.put("U0001", "High Speed CAN Communication Bus");
        DTC_MAP.put("U0100", "Lost Communication With ECM/PCM A");
        DTC_MAP.put("U0101", "Lost Communication With TCM");
        DTC_MAP.put("U0121", "Lost Communication With Anti-Lock Brake System (ABS) Control Module");
        DTC_MAP.put("U0140", "Lost Communication With Body Control Module");
        DTC_MAP.put("U0155", "Lost Communication With Instrument Panel Cluster (IPC) Control Module");
        DTC_MAP.put("U0164", "Lost Communication With HVAC Control Module");
        DTC_MAP.put("U0300", "Internal Control Module Software Incompatibility");
        DTC_MAP.put("U0401", "Invalid Data Received From ECM/PCM A");
        DTC_MAP.put("U0402", "Invalid Data Received From TCM");
        DTC_MAP.put("U0415", "Invalid Data Received From Anti-Lock Brake System (ABS) Control Module");
        DTC_MAP.put("U1100", "CAN Communication Bus Error");
        DTC_MAP.put("U1101", "CAN Communication Bus Error - Received Error");

        // BMW-Specific (P1xxx range)
        DTC_MAP.put("P1085", "O2 Sensor Control Limit Exceeded (Bank 1)");
        DTC_MAP.put("P1086", "O2 Sensor Control Limit Exceeded (Bank 2)");
        DTC_MAP.put("P1087", "O2 Sensor Heating After Engine Stop (Bank 1)");
        DTC_MAP.put("P1088", "O2 Sensor Heating After Engine Stop (Bank 2)");
        DTC_MAP.put("P112F", "Manifold Absolute Pressure Sensor Circuit");
        DTC_MAP.put("P1140", "Intake Air Temperature Sensor 2 Circuit");
        DTC_MAP.put("P1188", "Fuel Control Shift (Bank 1)");
        DTC_MAP.put("P1189", "Fuel Control Shift (Bank 2)");
        DTC_MAP.put("P1250", "Engine Coolant Level Switch");
        DTC_MAP.put("P128E", "Fuel Injection System Safety Shutdown");
        DTC_MAP.put("P12A6", "Fuel Injector Circuit Open (Cylinder 1)");
        DTC_MAP.put("P12A7", "Fuel Injector Circuit Open (Cylinder 2)");
        DTC_MAP.put("P12A8", "Fuel Injector Circuit Open (Cylinder 3)");
        DTC_MAP.put("P12A9", "Fuel Injector Circuit Open (Cylinder 4)");
        DTC_MAP.put("P12AA", "Fuel Injector Circuit Open (Cylinder 5)");
        DTC_MAP.put("P12AB", "Fuel Injector Circuit Open (Cylinder 6)");
        DTC_MAP.put("P1410", "Secondary Air Injection System - Circuit Malfunction");
        DTC_MAP.put("P1415", "Secondary Air Injection System - Bank 2");
        DTC_MAP.put("P1480", "Cooling Fan Control Circuit");
        DTC_MAP.put("P1500", "Idle Speed Control Valve Stuck Open");
        DTC_MAP.put("P1510", "Idle Speed Control Valve Stuck Closed");
        DTC_MAP.put("P1519", "Bank 1 VANOS Stuck");
        DTC_MAP.put("P1520", "Bank 2 VANOS Stuck");
        DTC_MAP.put("P1522", "VANOS Control Solenoid Circuit (Bank 1)");
        DTC_MAP.put("P1523", "VANOS Control Solenoid Circuit (Bank 2)");
        DTC_MAP.put("P1525", "VANOS Position Actuator Circuit (Bank 1)");
        DTC_MAP.put("P1527", "VANOS Position Actuator Circuit (Bank 2)");
        DTC_MAP.put("P1542", "Pedal Position Sensor Plausibility");
        DTC_MAP.put("P1550", "Battery Current Sensor Circuit");
        DTC_MAP.put("P1620", "Map Cooling Thermostat Control Circuit");
        DTC_MAP.put("P1633", "Throttle Valve Adaptation Value");
        DTC_MAP.put("P1634", "Throttle Valve Spring Test");
        DTC_MAP.put("P1640", "Internal Control Module EEPROM Error");
        DTC_MAP.put("P1656", "Cruise Control Inhibit Output Circuit");
        DTC_MAP.put("P1660", "Engine Torque Monitor 1 (Bank 1)");
        DTC_MAP.put("P1661", "Engine Torque Monitor 2 (Bank 2)");
        DTC_MAP.put("P1700", "Transmission Ratio Monitoring");
        DTC_MAP.put("P1727", "Transmission Range Switch Circuit");
        DTC_MAP.put("P1775", "Transmission Clutch Pressure Control Solenoid");
        DTC_MAP.put("P1780", "Transmission Mechanical Shift Failure");
        DTC_MAP.put("P18A6", "Fuel Pressure Relief Valve Open");
        DTC_MAP.put("P1A00", "O2 Sensor Circuit Slow Response");
        DTC_MAP.put("P1A20", "Fuel Quality Sensor Circuit");
        DTC_MAP.put("P1A30", "Engine Oil Level Sensor Circuit");
        DTC_MAP.put("P1B00", "Coolant Pump Control Circuit");
        DTC_MAP.put("P1C00", "Exhaust Gas Temperature Sensor Circuit");
        DTC_MAP.put("P1D00", "High Pressure Fuel Pump Control Circuit");
        DTC_MAP.put("P1E00", "Engine Oil Pressure Sensor Circuit");

        // Chassis (DSC/ABS)
        DTC_MAP.put("C0020", "ABS Pump Motor Control");
        DTC_MAP.put("C0021", "ABS Valve Power Supply Circuit");
        DTC_MAP.put("C0035", "Left Front Wheel Speed Sensor");
        DTC_MAP.put("C0040", "Right Front Wheel Speed Sensor");
        DTC_MAP.put("C0045", "Left Rear Wheel Speed Sensor");
        DTC_MAP.put("C0050", "Right Rear Wheel Speed Sensor");
        DTC_MAP.put("C0060", "ABS System Malfunction");
        DTC_MAP.put("C0070", "Yaw Rate Sensor");
        DTC_MAP.put("C0075", "Lateral Acceleration Sensor");
        DTC_MAP.put("C0080", "Steering Angle Sensor");
        DTC_MAP.put("C0090", "Deceleration Sensor");
        DTC_MAP.put("C0196", "ABS Hydraulic Pressure Differential Switch");
        DTC_MAP.put("C0201", "ABS Module Internal Error");
        DTC_MAP.put("C0240", "Engine Control Module Indicated Traction Control Malfunction");
        DTC_MAP.put("C0245", "Wheel Speed Sensor Frequency Error");
        DTC_MAP.put("C0250", "Wheel Speed Sensor Circuit Open");
        DTC_MAP.put("C0265", "ABS Control Module Power Circuit");
        DTC_MAP.put("C0270", "ABS Control Module Internal Circuit");
        DTC_MAP.put("C0280", "ABS Control Module Communication Error");
        DTC_MAP.put("C0290", "DSC Function Monitoring");
        DTC_MAP.put("C0295", "DSC Sensor Cluster");
        DTC_MAP.put("C0300", "Steering Angle Sensor Plausibility");

        // Body (FRM/SZM/etc)
        DTC_MAP.put("B1000", "Body Control Module Internal Error");
        DTC_MAP.put("B1001", "Control Module Internal Memory");
        DTC_MAP.put("B1010", "Light Switch Circuit");
        DTC_MAP.put("B1015", "License Plate Light Circuit");
        DTC_MAP.put("B1020", "Brake Light Circuit");
        DTC_MAP.put("B1025", "Reverse Light Circuit");
        DTC_MAP.put("B1030", "Turn Signal Circuit");
        DTC_MAP.put("B1035", "Hazard Warning Light Circuit");
        DTC_MAP.put("B1040", "Fog Light Circuit");
        DTC_MAP.put("B1045", "Headlight Circuit");
        DTC_MAP.put("B1050", "High Beam Circuit");
        DTC_MAP.put("B1055", "Daytime Running Light Circuit");
        DTC_MAP.put("B1060", "Interior Light Circuit");
        DTC_MAP.put("B1065", "Trunk Light Circuit");
        DTC_MAP.put("B1070", "Door Contact Circuit");
        DTC_MAP.put("B1075", "Central Locking Circuit");
        DTC_MAP.put("B1080", "Window Lifter Circuit");
        DTC_MAP.put("B1085", "Mirror Adjustment Circuit");
        DTC_MAP.put("B1090", "Wiper Motor Circuit");
        DTC_MAP.put("B1095", "Washer Pump Circuit");
        DTC_MAP.put("B1100", "Horn Circuit");
        DTC_MAP.put("B1105", "Sunroof Circuit");
        DTC_MAP.put("B1110", "Seat Adjustment Circuit");
        DTC_MAP.put("B1115", "Seat Heating Circuit");
        DTC_MAP.put("B1120", "Steering Column Adjustment Circuit");
        DTC_MAP.put("B1300", "Power Distribution Failure");
        DTC_MAP.put("B1310", "Battery Voltage Monitor");
        DTC_MAP.put("B1320", "Ignition Switch Circuit");
        DTC_MAP.put("B1330", "Wake-Up Circuit");
        DTC_MAP.put("B1340", "Terminal 15 Circuit");
        DTC_MAP.put("B1350", "Terminal 30 Circuit");
        DTC_MAP.put("B1360", "Ground Circuit");
        DTC_MAP.put("B1400", "LIN Bus Communication Error");
        DTC_MAP.put("B1410", "K-Bus Communication Error");
        DTC_MAP.put("B1420", "Most Bus Communication Error");
    }

    /**
     * Get human-readable description for a DTC code.
     */
    public static String getDescription(String code) {
        if (code == null || code.isEmpty()) return "Unknown DTC";
        String normalized = code.toUpperCase().trim();
        return DTC_MAP.getOrDefault(normalized, "Unknown diagnostic trouble code: " + code);
    }

    /**
     * Check if a DTC code is known in the database.
     */
    public static boolean isKnown(String code) {
        if (code == null || code.isEmpty()) return false;
        return DTC_MAP.containsKey(code.toUpperCase().trim());
    }
}
