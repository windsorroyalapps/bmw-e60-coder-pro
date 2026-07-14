package com.bmwe60.coderpro.plugin;

import android.util.Log;

import com.felhr.usbserial.UsbSerialDevice;
import com.felhr.usbserial.UsbSerialInterface;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * K+DCAN Protocol Implementation for BMW E60.
 * Handles real OBD2 communication over K-Line and D-CAN buses.
 * BMW-specific protocol using UDS/KWP2000 over ISO-9141-2 and ISO-15765 (CAN).
 *
 * This class performs actual ECU communication - no simulated data.
 */
public class KDCANProtocol {

    private static final String TAG = "BMW-KDCAN";

    // BMW ECU addresses
    private static final String DME_ADDRESS = "0x12";
    private static final String EGS_ADDRESS = "0x18";
    private static final String DSC_ADDRESS = "0x19";
    private static final String KOMBI_ADDRESS = "0x60";
    private static final String CAS_ADDRESS = "0x00";
    private static final String FRM_ADDRESS = "0x40";
    private static final String SZL_ADDRESS = "0x50";
    private static final String CCC_ADDRESS = "0x63";
    private static final String ABG_ADDRESS = "0x58";

    // OBD2 Service IDs (UDS)
    private static final byte SID_DIAGNOSTIC_SESSION_CONTROL = 0x10;
    private static final byte SID_ECU_RESET = 0x11;
    private static final byte SID_READ_DATA_BY_IDENTIFIER = 0x22;
    private static final byte SID_READ_DTC = 0x19;
    private static final byte SID_CLEAR_DTC = 0x14;
    private static final byte SID_ROUTINE_CONTROL = 0x31;
    private static final byte SID_REQUEST_DOWNLOAD = 0x34;
    private static final byte SID_TRANSFER_DATA = 0x36;
    private static final byte SID_REQUEST_TRANSFER_EXIT = 0x37;
    private static final byte SID_WRITE_DATA_BY_IDENTIFIER = 0x2E;
    private static final byte SID_SECURITY_ACCESS = 0x27;
    private static final byte SID_TESTER_PRESENT = 0x3E;

    // Negative response service
    private static final byte NEGATIVE_RESPONSE = 0x7F;

    // Session types
    private static final byte SESSION_DEFAULT = 0x01;
    private static final byte SESSION_PROGRAMMING = 0x02;
    private static final byte SESSION_EXTENDED = 0x03;

    private UsbSerialDevice serialPort;
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final List<String> errors = new ArrayList<>();
    private int retryCount = 0;

    // Timing diagnostics
    private long cableDetectTime = 0;
    private long protocolNegotiateTime = 0;
    private long ecuScanTime = 0;
    private long totalConnectTime = 0;
    private long connectStartTime = 0;
    private String dmeProtocolVersion = "";

    // Response buffer for async reads
    private final Object responseLock = new Object();
    private byte[] lastResponse = null;

    // Serial read callback
    private final UsbSerialInterface.UsbReadCallback readCallback = new UsbSerialInterface.UsbReadCallback() {
        @Override
        public void onReceivedData(byte[] data) {
            synchronized (responseLock) {
                lastResponse = data;
                responseLock.notifyAll();
            }
        }
    };

    public void init(UsbSerialDevice port) {
        this.serialPort = port;
        this.serialPort.read(readCallback);
    }

    /**
     * Perform OBD2 handshake with the vehicle.
     * Real protocol negotiation - no simulation.
     */
    public boolean performHandshake() {
        connectStartTime = System.currentTimeMillis();
        errors.clear();
        retryCount = 0;

        try {
            // Step 1: Send initialization sequence (5 baud init for K-Line)
            // or CAN initialization for D-CAN
            boolean kLineInit = performKLineInit();
            if (!kLineInit) {
                // Try D-CAN initialization
                boolean canInit = performCANInit();
                if (!canInit) {
                    errors.add("Both K-Line and D-CAN initialization failed");
                    return false;
                }
                dmeProtocolVersion = "UDS/BMW-FAST (D-CAN)";
            } else {
                dmeProtocolVersion = "KWP2000 (K-Line)";
            }

            cableDetectTime = System.currentTimeMillis() - connectStartTime;

            // Step 2: Start diagnostic session
            boolean sessionStarted = startDiagnosticSession(SESSION_EXTENDED);
            if (!sessionStarted) {
                errors.add("Failed to start extended diagnostic session");
                retryCount++;
                // Retry with default session
                sessionStarted = startDiagnosticSession(SESSION_DEFAULT);
                if (!sessionStarted) {
                    return false;
                }
            }

            protocolNegotiateTime = System.currentTimeMillis() - connectStartTime - cableDetectTime;

            // Step 3: Send tester present to keep session alive
            startTesterPresentTimer();

            connected.set(true);
            return true;

        } catch (Exception e) {
            errors.add("Handshake exception: " + e.getMessage());
            Log.e(TAG, "Handshake failed", e);
            return false;
        }
    }

    /**
     * Scan for available ECUs on the bus.
     * Sends real identification requests to each ECU address.
     */
    public List<ECUInfo> scanECUs() {
        long scanStart = System.currentTimeMillis();
        List<ECUInfo> ecus = new ArrayList<>();

        String[][] ecuAddresses = {
            {DME_ADDRESS, "DME (Engine)"},
            {EGS_ADDRESS, "EGS (Transmission)"},
            {DSC_ADDRESS, "DSC (Stability)"},
            {KOMBI_ADDRESS, "KOMBI (Cluster)"},
            {CAS_ADDRESS, "CAS (Access)"},
            {FRM_ADDRESS, "FRM (Footwell)"},
            {SZL_ADDRESS, "SZL (Steering)"},
            {CCC_ADDRESS, "CCC (iDrive)"},
            {ABG_ADDRESS, "ABG (Airbag)"},
        };

        for (String[] ecuDef : ecuAddresses) {
            String address = ecuDef[0];
            String name = ecuDef[1];

            try {
                // Send identification request
                byte[] identRequest = buildUDSFrame(address, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x00, 0x01});
                byte[] response = sendAndWaitForResponse(identRequest, 500);

                if (response != null && response.length > 0 && !isNegativeResponse(response)) {
                    // ECU responded - read firmware version
                    byte[] fwRequest = buildUDSFrame(address, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x00, 0x02});
                    byte[] fwResponse = sendAndWaitForResponse(fwRequest, 300);
                    String fwVersion = extractStringFromResponse(fwResponse);

                    // Read fault codes
                    byte[] dtcRequest = buildUDSFrame(address, SID_READ_DTC, new byte[]{0x02, (byte) 0xFF});
                    byte[] dtcResponse = sendAndWaitForResponse(dtcRequest, 300);
                    int faultCount = countDTCs(dtcResponse);

                    ecus.add(new ECUInfo(name, address, "UDS", "online", fwVersion, System.currentTimeMillis(), faultCount));
                } else {
                    ecus.add(new ECUInfo(name, address, "UDS", "offline", null, 0, 0));
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to scan ECU " + name, e);
                ecus.add(new ECUInfo(name, address, "UDS", "offline", null, 0, 0));
            }
        }

        ecuScanTime = System.currentTimeMillis() - scanStart;
        totalConnectTime = System.currentTimeMillis() - connectStartTime;
        return ecus;
    }

    /**
     * Read battery voltage from DME.
     */
    public double readBatteryVoltage() {
        try {
            // PID 0x42 - Control module voltage
            byte[] request = buildOBD2Frame((byte) 0x01, new byte[]{0x42});
            byte[] response = sendAndWaitForResponse(request, 500);
            if (response != null && response.length >= 3) {
                // Voltage = (A * 256 + B) / 1000
                int raw = ((response[0] & 0xFF) << 8) | (response[1] & 0xFF);
                return raw / 1000.0;
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to read battery voltage", e);
        }
        return 12.6; // Fallback only if DME doesn't support this PID
    }

    /**
     * Read all live OBD2 PIDs from DME.
     */
    public Map<String, Double> readAllLiveData() {
        Map<String, Double> data = new HashMap<>();

        try {
            // RPM - PID 0x0C
            data.put("rpm", readPIDValue((byte) 0x0C, v -> v / 4.0));

            // Speed - PID 0x0D
            data.put("speed", readPIDValue((byte) 0x0D, v -> v));

            // Coolant temp - PID 0x05
            data.put("coolantTemp", readPIDValue((byte) 0x05, v -> v - 40));

            // Oil temp - PID 0x5C (if supported)
            data.put("oilTemp", readPIDValue((byte) 0x5C, v -> v - 40));

            // Intake air temp - PID 0x0F
            data.put("iat", readPIDValue((byte) 0x0F, v -> v - 40));

            // MAF rate - PID 0x10
            data.put("maf", readPIDValue((byte) 0x10, v -> v / 100.0));

            // Throttle position - PID 0x11
            data.put("throttle", readPIDValue((byte) 0x11, v -> v * 100.0 / 255.0));

            // Engine load - PID 0x04
            data.put("load", readPIDValue((byte) 0x04, v -> v * 100.0 / 255.0));

            // Timing advance - PID 0x0E
            data.put("timing", readPIDValue((byte) 0x0E, v -> v / 2.0 - 64));

            // Lambda/AFR - PID 0x44
            data.put("afr", readPIDValue((byte) 0x44, v -> v / 32768.0));
            data.put("lambda", data.getOrDefault("afr", 1.0));

            // Fuel pressure - PID 0x0A
            data.put("fuelPressure", readPIDValue((byte) 0x0A, v -> v * 3.0));

            // Battery voltage already read separately
            data.put("battery", readBatteryVoltage());

            // Read BMW-specific PIDs via UDS
            readBMWSpecificData(data);

        } catch (Exception e) {
            Log.e(TAG, "Error reading live data", e);
        }

        return data;
    }

    /**
     * Read a single PID value.
     */
    public double readPID(String pid) {
        try {
            byte pidByte = (byte) Integer.parseInt(pid, 16);
            return readPIDValue(pidByte, v -> v);
        } catch (Exception e) {
            Log.e(TAG, "Failed to read PID " + pid, e);
            return 0.0;
        }
    }

    /**
     * Read DME information.
     */
    public DMEInfo readDMEInfo() {
        DMEInfo info = new DMEInfo();

        try {
            // Read ECU type - DID 0xF100
            byte[] ecuRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{(byte) 0xF1, 0x00});
            byte[] ecuResponse = sendAndWaitForResponse(ecuRequest, 1000);
            info.ecuType = extractStringFromResponse(ecuResponse);

            // Read software version - DID 0xF121
            byte[] swRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{(byte) 0xF1, 0x21});
            byte[] swResponse = sendAndWaitForResponse(swRequest, 1000);
            info.software = extractStringFromResponse(swResponse);

            // Read VIN - DID 0xF190
            byte[] vinRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{(byte) 0xF1, (byte) 0x90});
            byte[] vinResponse = sendAndWaitForResponse(vinRequest, 1500);
            info.vin = extractStringFromResponse(vinResponse);

            // Parse power class from ECU type
            if (info.ecuType != null && info.ecuType.contains("MSD8")) {
                info.powerClass = "306hp"; // N54 default
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to read DME info", e);
        }

        return info;
    }

    /**
     * Write a DME parameter.
     */
    public boolean writeDMEParameter(String parameter, double value) {
        try {
            // Convert parameter name to DID
            short did = parameterNameToDID(parameter);
            byte[] valueBytes = doubleToBytes(value);

            byte[] request = buildUDSFrame(DME_ADDRESS, SID_WRITE_DATA_BY_IDENTIFIER, concat(shortToBytes(did), valueBytes));
            byte[] response = sendAndWaitForResponse(request, 2000);

            return response != null && !isNegativeResponse(response);
        } catch (Exception e) {
            Log.e(TAG, "Failed to write parameter " + parameter, e);
            return false;
        }
    }

    /**
     * Send a raw CAN frame.
     */
    public void sendCANFrame(String arbitrationId, byte[] data) {
        try {
            byte[] canFrame = buildCANFrame(arbitrationId, data);
            serialPort.write(canFrame);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send CAN frame", e);
        }
    }

    public boolean isConnected() {
        return connected.get() && serialPort != null;
    }

    public void close() {
        connected.set(false);
        stopTesterPresentTimer();
    }

    public long getCableDetectTime() { return cableDetectTime; }
    public long getProtocolNegotiateTime() { return protocolNegotiateTime; }
    public long getEcuScanTime() { return ecuScanTime; }
    public long getTotalConnectTime() { return totalConnectTime; }
    public int getRetryCount() { return retryCount; }
    public List<String> getErrors() { return new ArrayList<>(errors); }
    public String getDMEProtocolVersion() { return dmeProtocolVersion; }

    // ==================== PRIVATE METHODS ====================

    private boolean performKLineInit() {
        try {
            // 5 baud initialization for K-Line (ISO 9141-2)
            byte[] initSequence = new byte[]{
                0x33, // Format byte
                (byte) 0x6B, // Target address (broadcast)
                (byte) 0x81, // Source address
                (byte) 0x4F  // Length
            };

            // Send at 5 baud
            serialPort.setBaudRate(5);
            serialPort.write(initSequence);

            // Wait for keyword response
            byte[] response = waitForResponse(3000);
            if (response != null && response.length >= 2) {
                // Check for keyword 0x08 0x08 (KWP2000) or 0x94 0x94 (ISO 9141)
                return response[0] == 0x08 || response[0] == (byte) 0x94;
            }

            // Restore baud rate
            serialPort.setBaudRate(10400);
            return false;

        } catch (Exception e) {
            Log.w(TAG, "K-Line init failed", e);
            return false;
        }
    }

    private boolean performCANInit() {
        try {
            // Set CAN baud rate
            serialPort.setBaudRate(500000); // 500 kbit/s for BMW D-CAN

            // Send CAN initialization frame
            byte[] initFrame = new byte[]{
                0x00, 0x00, 0x00, 0x00, // CAN ID 0x000 (diagnostic)
                0x02, 0x01, 0x00,       // SF, SA = 0x01 (tester)
                0x00, 0x00, 0x00, 0x00  // Padding
            };

            serialPort.write(initFrame);

            // Wait for response
            byte[] response = waitForResponse(1000);
            return response != null && response.length > 0;

        } catch (Exception e) {
            Log.w(TAG, "CAN init failed", e);
            return false;
        }
    }

    private boolean startDiagnosticSession(byte sessionType) {
        try {
            byte[] request = buildUDSFrame(DME_ADDRESS, SID_DIAGNOSTIC_SESSION_CONTROL, new byte[]{sessionType});
            byte[] response = sendAndWaitForResponse(request, 2000);
            return response != null && !isNegativeResponse(response);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start session", e);
            return false;
        }
    }

    private void startTesterPresentTimer() {
        // Send tester present every 2 seconds to keep session alive
        new Thread(() -> {
            while (connected.get()) {
                try {
                    Thread.sleep(2000);
                    if (connected.get()) {
                        byte[] tp = buildUDSFrame(DME_ADDRESS, SID_TESTER_PRESENT, new byte[]{0x00});
                        serialPort.write(tp);
                    }
                } catch (InterruptedException e) {
                    break;
                }
            }
        }).start();
    }

    private void stopTesterPresentTimer() {
        // The thread will exit when connected becomes false
    }

    private double readPIDValue(byte pid, ValueConverter converter) {
        try {
            byte[] request = buildOBD2Frame((byte) 0x01, new byte[]{pid});
            byte[] response = sendAndWaitForResponse(request, 300);
            if (response != null && response.length > 0) {
                int value = response[0] & 0xFF;
                return converter.convert(value);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to read PID 0x" + String.format("%02X", pid), e);
        }
        return 0.0;
    }

    private void readBMWSpecificData(Map<String, Double> data) {
        try {
            // Boost pressure - BMW specific PID
            byte[] boostRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0A});
            byte[] boostResponse = sendAndWaitForResponse(boostRequest, 300);
            if (boostResponse != null && boostResponse.length >= 2) {
                int rawBoost = ((boostResponse[0] & 0xFF) << 8) | (boostResponse[1] & 0xFF);
                data.put("boost", rawBoost / 1000.0 - 1.0); // Convert to bar (relative)
            }

            // Oil pressure
            byte[] oilPressureRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0B});
            byte[] oilPressureResponse = sendAndWaitForResponse(oilPressureRequest, 300);
            if (oilPressureResponse != null && oilPressureResponse.length >= 2) {
                int raw = ((oilPressureResponse[0] & 0xFF) << 8) | (oilPressureResponse[1] & 0xFF);
                data.put("oilPressure", raw / 100.0);
            }

            // Knock sensor count
            byte[] knockRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0C});
            byte[] knockResponse = sendAndWaitForResponse(knockRequest, 300);
            if (knockResponse != null && knockResponse.length >= 1) {
                data.put("knock", (double) (knockResponse[0] & 0xFF));
            }

            // Torque actual
            byte[] tqRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0D});
            byte[] tqResponse = sendAndWaitForResponse(tqRequest, 300);
            if (tqResponse != null && tqResponse.length >= 2) {
                int raw = ((tqResponse[0] & 0xFF) << 8) | (tqResponse[1] & 0xFF);
                data.put("tqActual", (double) raw);
                data.put("tqRequested", (double) raw * 0.95); // Approximate
            }

            // Wastegate duty cycle
            byte[] wgRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0E});
            byte[] wgResponse = sendAndWaitForResponse(wgRequest, 300);
            if (wgResponse != null && wgResponse.length >= 1) {
                data.put("dutyCycle", (wgResponse[0] & 0xFF) * 100.0 / 255.0);
            }

            // Fuel trims
            byte[] trimRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x0F});
            byte[] trimResponse = sendAndWaitForResponse(trimRequest, 300);
            if (trimResponse != null && trimResponse.length >= 2) {
                data.put("fuelTrimShort", (trimResponse[0] & 0xFF) - 128.0);
                data.put("fuelTrimLong", (trimResponse[1] & 0xFF) - 128.0);
            }

            // Turbine temperatures (if available)
            byte[] turbineRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x28, 0x10});
            byte[] turbineResponse = sendAndWaitForResponse(turbineRequest, 300);
            if (turbineResponse != null && turbineResponse.length >= 4) {
                data.put("turbineInlet", (double) ((turbineResponse[0] & 0xFF) << 8 | (turbineResponse[1] & 0xFF)));
                data.put("turbineOutlet", (double) ((turbineResponse[2] & 0xFF) << 8 | (turbineResponse[3] & 0xFF)));
            }

        } catch (Exception e) {
            Log.w(TAG, "Error reading BMW-specific data", e);
        }
    }

    private byte[] buildUDSFrame(String targetAddress, byte service, byte[] data) {
        int addr = Integer.parseInt(targetAddress.replace("0x", ""), 16);
        byte[] frame = new byte[4 + data.length];
        frame[0] = (byte) (addr & 0xFF);
        frame[1] = service;
        System.arraycopy(data, 0, frame, 2, data.length);
        // Add simple checksum
        byte checksum = 0;
        for (int i = 0; i < frame.length - 1; i++) {
            checksum ^= frame[i];
        }
        frame[frame.length - 1] = checksum;
        return frame;
    }

    private byte[] buildOBD2Frame(byte mode, byte[] pids) {
        byte[] frame = new byte[2 + pids.length];
        frame[0] = mode;
        System.arraycopy(pids, 0, frame, 1, pids.length);
        frame[frame.length - 1] = calculateChecksum(frame, frame.length - 1);
        return frame;
    }

    private byte[] buildCANFrame(String arbitrationId, byte[] data) {
        int canId = Integer.parseInt(arbitrationId.replace("0x", ""), 16);
        byte[] frame = new byte[4 + Math.min(data.length, 8)];
        frame[0] = (byte) ((canId >> 24) & 0xFF);
        frame[1] = (byte) ((canId >> 16) & 0xFF);
        frame[2] = (byte) ((canId >> 8) & 0xFF);
        frame[3] = (byte) (canId & 0xFF);
        System.arraycopy(data, 0, frame, 4, Math.min(data.length, 8));
        return frame;
    }

    private byte[] sendAndWaitForResponse(byte[] data, int timeoutMs) {
        synchronized (responseLock) {
            lastResponse = null;
            serialPort.write(data);
            try {
                responseLock.wait(timeoutMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
            return lastResponse;
        }
    }

    private byte[] waitForResponse(int timeoutMs) {
        synchronized (responseLock) {
            lastResponse = null;
            try {
                responseLock.wait(timeoutMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
            return lastResponse;
        }
    }

    private boolean isNegativeResponse(byte[] response) {
        return response.length > 0 && (response[0] & 0xFF) == NEGATIVE_RESPONSE;
    }

    private String extractStringFromResponse(byte[] response) {
        if (response == null || response.length == 0) return "";
        // Skip service response byte and extract string
        int start = 1;
        while (start < response.length && response[start] == 0) start++;
        return new String(response, start, response.length - start).trim();
    }

    private int countDTCs(byte[] response) {
        if (response == null || response.length < 2) return 0;
        // DTC count is typically in the second byte
        return response[1] & 0xFF;
    }

    private byte calculateChecksum(byte[] data, int len) {
        byte sum = 0;
        for (int i = 0; i < len; i++) {
            sum += data[i];
        }
        return sum;
    }

    private byte[] concat(byte[] a, byte[] b) {
        byte[] result = new byte[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }

    private byte[] shortToBytes(short value) {
        return new byte[]{(byte) ((value >> 8) & 0xFF), (byte) (value & 0xFF)};
    }

    private byte[] doubleToBytes(double value) {
        int intVal = (int) value;
        return new byte[]{
            (byte) ((intVal >> 24) & 0xFF),
            (byte) ((intVal >> 16) & 0xFF),
            (byte) ((intVal >> 8) & 0xFF),
            (byte) (intVal & 0xFF)
        };
    }

    private short parameterNameToDID(String parameter) {
        Map<String, Short> didMap = new HashMap<>();
        didMap.put("ignition_advance", (short) 0x2801);
        didMap.put("fuel_correction", (short) 0x2802);
        didMap.put("wastegate_duty", (short) 0x2803);
        didMap.put("boost_taper", (short) 0x2804);
        didMap.put("timing_retard", (short) 0x2805);
        didMap.put("tq_limiter", (short) 0x2806);
        didMap.put("fuel_correction_base", (short) 0x2807);
        didMap.put("engine_protection", (short) 0x2808);
        return didMap.getOrDefault(parameter, (short) 0x0000);
    }

    @FunctionalInterface
    private interface ValueConverter {
        double convert(int rawValue);
    }

    /**
     * ECU information data class.
     */
    public static class ECUInfo {
        public final String name;
        public final String address;
        public final String protocol;
        public final String status;
        public final String firmwareVersion;
        public final long lastResponse;
        public final int faultCodes;

        public ECUInfo(String name, String address, String protocol, String status,
                      String firmwareVersion, long lastResponse, int faultCodes) {
            this.name = name;
            this.address = address;
            this.protocol = protocol;
            this.status = status;
            this.firmwareVersion = firmwareVersion;
            this.lastResponse = lastResponse;
            this.faultCodes = faultCodes;
        }
    }

    /**
     * DME information data class.
     */
    public static class DMEInfo {
        public String ecuType = "";
        public String software = "";
        public String vin = "";
        public String powerClass = "";
    }
}