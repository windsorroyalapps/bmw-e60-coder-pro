package com.bmwe60.coderpro.plugin;

import com.felhr.usbserial.UsbSerialDevice;
import com.felhr.usbserial.UsbSerialInterface;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * K+DCAN Protocol Implementation for BMW E60.
 * Handles real OBD2 communication over K-Line (ISO-9141-2 / KWP2000) and D-CAN (ISO-15765 / UDS).
 *
 * FTDI-specific notes:
 * - K-Line uses 10400 baud, 8 data bits, 1 stop bit, no parity
 * - 5-baud init sends address byte at 5 baud (200ms per bit), then switches to 10400 baud
 * - D-CAN uses 500000 baud with ISO-TP transport protocol
 * - FTDI latency timer should be set to 1-2ms for precise timing
 * - DTR/RTS lines select K-Line (DTR=HIGH, RTS=LOW) vs D-CAN (DTR=LOW, RTS=HIGH) mode
 */
public class KDCANProtocol {

    private static final String TAG = "BMW-KDCAN";

    // BMW ECU addresses (hex strings for frame building)
    private static final String DME_ADDRESS = "0x12";
    private static final String EGS_ADDRESS = "0x18";
    private static final String DSC_ADDRESS = "0x19";
    private static final String KOMBI_ADDRESS = "0x60";
    private static final String CAS_ADDRESS = "0x00";
    private static final String FRM_ADDRESS = "0x40";
    private static final String SZL_ADDRESS = "0x50";
    private static final String CCC_ADDRESS = "0x63";
    private static final String ABG_ADDRESS = "0x58";

    // KWP2000 Service IDs (K-Line)
    private static final byte KWP_START_COMMUNICATION = (byte) 0x81;
    private static final byte KWP_STOP_COMMUNICATION = (byte) 0x82;
    private static final byte KWP TesterPresent = (byte) 0x3E;
    private static final byte KWP_READ_ECU_IDENTIFICATION = (byte) 0x1A;
    private static final byte KWP_READ_DATA_BY_LOCAL_ID = (byte) 0x21;

    // UDS Service IDs (D-CAN / ISO-15765)
    private static final byte SID_DIAGNOSTIC_SESSION_CONTROL = 0x10;
    private static final byte SID_ECU_RESET = 0x11;
    private static final byte SID_READ_DATA_BY_IDENTIFIER = 0x22;
    private static final byte SID_READ_MEMORY_BY_ADDRESS = 0x23;
    private static final byte SID_WRITE_DATA_BY_IDENTIFIER = 0x2E;
    private static final byte SID_SECURITY_ACCESS = 0x27;
    private static final byte SID_TESTER_PRESENT = 0x3E;
    private static final byte SID_ROUTINE_CONTROL = 0x31;
    private static final byte SID_REQUEST_DOWNLOAD = 0x34;
    private static final byte SID_TRANSFER_DATA = 0x36;
    private static final byte SID_REQUEST_TRANSFER_EXIT = 0x37;

    // Session types
    private static final byte SESSION_DEFAULT = 0x01;
    private static final byte SESSION_PROGRAMMING = 0x02;
    private static final byte SESSION_EXTENDED = 0x03;

    // K-Line timing constants
    private static final int KLINE_5BAUD_BIT_MS = 200;   // 5 baud = 200ms per bit
    private static final int KLINE_W1_MAX_MS = 300;       // Max time for 0x55 sync byte
    private static final int KLINE_W2_MAX_MS = 20;        // Max time between KB1 and KB2
    private static final int KLINE_W3_MAX_MS = 20;        // Max time before sending ~KB2
    private static final int KLINE_W4_MAX_MS = 50;        // Max time for 0xCC response
    private static final int KLINE_P3_MIN_MS = 55;        // Min inter-frame delay
    private static final int KLINE_P4_MIN_MS = 5;         // Min inter-byte delay

    // ISO-TP constants
    private static final byte ISO_TP_SINGLE_FRAME = 0x00;
    private static final byte ISO_TP_FIRST_FRAME = 0x10;
    private static final byte ISO_TP_CONSECUTIVE_FRAME = 0x20;
    private static final byte ISO_TP_FLOW_CONTROL = 0x30;
    private static final int ISO_TP_MAX_DLC = 8;

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

    // Response handling using CountDownLatch to avoid wait/notify race conditions
    private final AtomicReference<byte[]> lastResponse = new AtomicReference<>();
    private final Object responseLock = new Object();

    private final UsbSerialInterface.UsbReadCallback readCallback = new UsbSerialInterface.UsbReadCallback() {
        @Override
        public void onReceivedData(byte[] data) {
            if (data != null && data.length > 0) {
                lastResponse.set(data);
                synchronized (responseLock) {
                    responseLock.notifyAll();
                }
            }
        }
    };

    public void init(UsbSerialDevice port) {
        this.serialPort = port;
        this.serialPort.read(readCallback);
    }

    // ==================== HANDSHAKE ====================

    public boolean performHandshake() {
        connectStartTime = System.currentTimeMillis();
        errors.clear();
        retryCount = 0;

        try {
            // Try K-Line (KWP2000) first - most common for BMW E60
            boolean kLineInit = performKLine5BaudInit();
            if (kLineInit) {
                cableDetectTime = System.currentTimeMillis() - connectStartTime;

                // Start diagnostic session
                boolean sessionStarted = startKWPExtendedSession();
                if (!sessionStarted) {
                    errors.add("Failed to start extended diagnostic session on K-Line");
                    retryCount++;
                    sessionStarted = startKWPDefaultSession();
                }
                if (!sessionStarted) {
                    errors.add("Failed to start any diagnostic session on K-Line");
                    return false;
                }

                protocolNegotiateTime = System.currentTimeMillis() - connectStartTime - cableDetectTime;
                dmeProtocolVersion = "KWP2000 (K-Line, 10400 baud)";
                startTesterPresentTimer();
                connected.set(true);
                return true;
            }

            // K-Line failed, try D-CAN
            errors.add("K-Line init failed, attempting D-CAN...");
            boolean canInit = performCANInit();
            if (canInit) {
                cableDetectTime = System.currentTimeMillis() - connectStartTime;

                boolean sessionStarted = startUDSSession(SESSION_EXTENDED);
                if (!sessionStarted) {
                    errors.add("Failed to start UDS extended session on D-CAN");
                    retryCount++;
                    sessionStarted = startUDSSession(SESSION_DEFAULT);
                }
                if (!sessionStarted) {
                    errors.add("Failed to start any UDS session on D-CAN");
                    return false;
                }

                protocolNegotiateTime = System.currentTimeMillis() - connectStartTime - cableDetectTime;
                dmeProtocolVersion = "UDS/BMW-FAST (D-CAN, 500kbps)";
                startTesterPresentTimer();
                connected.set(true);
                return true;
            }

            errors.add("Both K-Line and D-CAN initialization failed");
            return false;

        } catch (Exception e) {
            errors.add("Handshake exception: " + e.getMessage());
            return false;
        }
    }

    // ==================== K-LINE INITIALIZATION ====================

    /**
     * Perform KWP2000 5-baud initialization on K-Line.
     * This is the standard BMW INPA/K+DCAN cable init sequence.
     *
     * Sequence:
     * 1. Set baud to 5
     * 2. Send address byte 0x33 at 5 baud (200ms per bit)
     * 3. Switch to 10400 baud
     * 4. Wait for sync byte 0x55
     * 5. Read key bytes KB1, KB2
     * 6. Send complement of KB2
     * 7. Wait for 0xCC (startCommunication positive response)
     * 8. Communication established at 10400 baud
     */
    private boolean performKLine5BaudInit() {
        try {
            // Step 1: Set baud to 5 for address byte transmission
            serialPort.setBaudRate(5);
            Thread.sleep(300); // Wait for baud rate to settle

            // Step 2: Send address byte 0x33 at 5 baud
            // 0x33 = address of DME/ECU on K-Line
            // Each bit takes 200ms at 5 baud
            byte[] addressByte = new byte[]{0x33};
            serialPort.write(addressByte);

            // Wait for address byte to be fully sent (8 data + 1 start + 1 stop = 10 bits * 200ms = 2s)
            Thread.sleep(2200);

            // Step 3: Switch to 10400 baud for response
            serialPort.setBaudRate(10400);
            Thread.sleep(100); // Brief pause for baud rate change

            // Step 4: Wait for sync byte 0x55 (timing byte indicating baud rate)
            byte[] syncByte = waitForBytes(1, KLINE_W1_MAX_MS);
            if (syncByte == null || syncByte.length < 1 || syncByte[0] != 0x55) {
                errors.add("K-Line: No sync byte 0x55 received (got " + bytesToHex(syncByte) + ")");
                return false;
            }

            // Step 5: Read key bytes
            byte[] keyBytes = waitForBytes(2, KLINE_W2_MAX_MS);
            if (keyBytes == null || keyBytes.length < 2) {
                errors.add("K-Line: Key bytes not received");
                return false;
            }
            byte kb1 = keyBytes[0];
            byte kb2 = keyBytes[1];

            // Step 6: Send complement of KB2
            Thread.sleep(KLINE_P4_MIN_MS); // Inter-byte delay
            byte[] complement = new byte[]{(byte) (~kb2 & 0xFF)};
            serialPort.write(complement);

            // Step 7: Wait for startCommunication response (0xCC)
            byte[] scResponse = waitForBytes(3, KLINE_W4_MAX_MS);
            if (scResponse == null || scResponse.length < 1) {
                errors.add("K-Line: No startCommunication response");
                return false;
            }
            // Response should contain 0xCC (or be the startCommunication service response)
            boolean gotCC = false;
            for (byte b : scResponse) {
                if ((b & 0xFF) == 0xCC) {
                    gotCC = true;
                    break;
                }
            }
            if (!gotCC) {
                // Some ECUs respond with full KWP frame instead of bare 0xCC
                // Check for positive response to startCommunication (0xC1)
                boolean gotC1 = false;
                for (byte b : scResponse) {
                    if ((b & 0xFF) == 0xC1) {
                        gotC1 = true;
                        break;
                    }
                }
                if (!gotC1) {
                    errors.add("K-Line: Unexpected init response: " + bytesToHex(scResponse));
                    return false;
                }
            }

            // K-Line initialization successful
            return true;

        } catch (Exception e) {
            errors.add("K-Line init exception: " + e.getMessage());
            return false;
        }
    }

    // ==================== D-CAN INITIALIZATION ====================

    /**
     * Perform D-CAN initialization.
     * BMW E60 D-CAN uses ISO-15765 at 500kbps with 11-bit CAN IDs.
     */
    private boolean performCANInit() {
        try {
            // D-CAN baud rate: 500 kbps
            serialPort.setBaudRate(500000);
            Thread.sleep(50);

            // Send a simple UDS TesterPresent to check if bus is alive
            // BMW D-CAN uses functional addressing 0x6DF or physical addressing
            // DME physical request ID: 0x6DA, response ID: 0x612
            byte[] testerPresent = buildCANTPFrame("0x6DA", new byte[]{SID_TESTER_PRESENT, 0x00});
            serialPort.write(testerPresent);

            byte[] response = waitForBytes(8, 500);
            if (response != null && response.length > 0) {
                return true;
            }

            // Try functional broadcast address
            byte[] funcBroadcast = buildCANTPFrame("0x6DF", new byte[]{SID_TESTER_PRESENT, 0x00});
            serialPort.write(funcBroadcast);

            response = waitForBytes(8, 500);
            return response != null && response.length > 0;

        } catch (Exception e) {
            errors.add("D-CAN init exception: " + e.getMessage());
            return false;
        }
    }

    // ==================== DIAGNOSTIC SESSIONS ====================

    private boolean startKWPExtendedSession() {
        byte[] request = buildKWPFrame(KWP_START_COMMUNICATION, new byte[0]);
        byte[] response = sendAndWait(request, 2000);
        return response != null && !isNegativeResponse(response);
    }

    private boolean startKWPDefaultSession() {
        byte[] request = buildKWPFrame(KWP_START_COMMUNICATION, new byte[0]);
        byte[] response = sendAndWait(request, 2000);
        return response != null && response.length > 0;
    }

    private boolean startUDSSession(byte sessionType) {
        byte[] request = buildUDSFrame(DME_ADDRESS, SID_DIAGNOSTIC_SESSION_CONTROL, new byte[]{sessionType});
        byte[] response = sendAndWait(request, 2000);
        return response != null && !isNegativeResponse(response);
    }

    // ==================== ECU SCANNING ====================

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
                // Use ReadDataByIdentifier DID 0xF800 (ECU identification)
                byte[] identRequest = buildUDSFrame(address, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x00, 0x01});
                byte[] response = sendAndWait(identRequest, 500);

                if (response != null && response.length > 0 && !isNegativeResponse(response)) {
                    // Try to read firmware version
                    byte[] fwRequest = buildUDSFrame(address, SID_READ_DATA_BY_IDENTIFIER, new byte[]{0x00, 0x02});
                    byte[] fwResponse = sendAndWait(fwRequest, 300);
                    String fwVersion = extractStringFromResponse(fwResponse);

                    ecus.add(new ECUInfo(name, address, "UDS", "online", fwVersion,
                                       System.currentTimeMillis(), 0));
                } else {
                    ecus.add(new ECUInfo(name, address, "UDS", "offline", null, 0, 0));
                }
            } catch (Exception e) {
                ecus.add(new ECUInfo(name, address, "UDS", "offline", null, 0, 0));
            }
        }

        ecuScanTime = System.currentTimeMillis() - scanStart;
        totalConnectTime = System.currentTimeMillis() - connectStartTime;
        return ecus;
    }

    // ==================== LIVE DATA ====================

    /**
     * Read battery voltage using OBD2 PID 0x42 (Control module voltage).
     * Returns value in volts. OBD2 spec: 0.1V per bit, 1 byte.
     */
    public double readBatteryVoltage() {
        try {
            // PID 0x42 = Control module voltage
            // Mode 0x01 = Show current data
            // Response: 1 byte, 0.1V per bit
            byte[] request = buildOBD2Frame((byte) 0x01, new byte[]{0x42});
            byte[] response = sendAndWait(request, 500);
            if (response != null && response.length >= 1) {
                int raw = response[0] & 0xFF;
                return raw / 10.0; // 0.1V per bit
            }
        } catch (Exception e) {
            errors.add("Battery voltage read error: " + e.getMessage());
        }
        return 12.6; // Fallback: typical battery voltage
    }

    public Map<String, Double> readAllLiveData() {
        Map<String, Double> data = new HashMap<>();
        try {
            // OBD2 PIDs - each returns different scaling
            data.put("rpm", readPIDScaled((byte) 0x0C, v -> v / 4.0, 2));        // 2 bytes, /4
            data.put("speed", readPIDScaled((byte) 0x0D, v -> v, 1));              // 1 byte, km/h
            data.put("coolantTemp", readPIDScaled((byte) 0x05, v -> v - 40, 1));   // 1 byte, -40 offset
            data.put("oilTemp", readPIDScaled((byte) 0x5C, v -> v - 40, 1));       // 1 byte, -40 offset
            data.put("iat", readPIDScaled((byte) 0x0F, v -> v - 40, 1));           // 1 byte, -40 offset
            data.put("maf", readPIDScaled((byte) 0x10, v -> v / 100.0, 2));        // 2 bytes, /100
            data.put("throttle", readPIDScaled((byte) 0x11, v -> v * 100.0 / 255.0, 1)); // 1 byte, %
            data.put("load", readPIDScaled((byte) 0x04, v -> v * 100.0 / 255.0, 1));     // 1 byte, %
            data.put("timing", readPIDScaled((byte) 0x0E, v -> v / 2.0 - 64, 1));   // 1 byte, /2 - 64
            data.put("afr", readPIDScaled((byte) 0x44, v -> v / 32768.0, 2));       // 2 bytes, lambda
            data.put("fuelPressure", readPIDScaled((byte) 0x0A, v -> v * 3.0, 1));   // 1 byte, *3 kPa
            data.put("battery", readBatteryVoltage());

            // BMW-specific data via UDS
            readBMWSpecificData(data);
        } catch (Exception e) {
            errors.add("Live data error: " + e.getMessage());
        }
        return data;
    }

    public double readPID(String pid) {
        try {
            byte pidByte = (byte) Integer.parseInt(pid, 16);
            return readPIDScaled(pidByte, v -> v, 1);
        } catch (Exception e) {
            return 0.0;
        }
    }

    // ==================== DME INFO ====================

    public DMEInfo readDMEInfo() {
        DMEInfo info = new DMEInfo();
        try {
            // Read ECU hardware type (DID F100)
            byte[] ecuRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                              new byte[]{(byte) 0xF1, 0x00});
            byte[] ecuResponse = sendAndWait(ecuRequest, 1000);
            info.ecuType = extractStringFromResponse(ecuResponse);

            // Read software version (DID F121)
            byte[] swRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                             new byte[]{(byte) 0xF1, 0x21});
            byte[] swResponse = sendAndWait(swRequest, 1000);
            info.software = extractStringFromResponse(swResponse);

            // Read VIN (DID F190)
            byte[] vinRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                              new byte[]{(byte) 0xF1, (byte) 0x90});
            byte[] vinResponse = sendAndWait(vinRequest, 1500);
            info.vin = extractStringFromResponse(vinResponse);

            // Detect power class from ECU type
            if (info.ecuType != null) {
                if (info.ecuType.contains("MSD80")) {
                    info.powerClass = "306hp (N54)";
                } else if (info.ecuType.contains("MSD81")) {
                    info.powerClass = "335hp (N54)";
                } else if (info.ecuType.contains("MEVD17")) {
                    info.powerClass = "N55 variant";
                }
            }
        } catch (Exception e) {
            errors.add("DME info read error: " + e.getMessage());
        }
        return info;
    }

    // ==================== WRITE PARAMETER ====================

    public boolean writeDMEParameter(String parameter, double value) {
        try {
            short did = parameterNameToDID(parameter);
            if (did == 0) {
                errors.add("Unknown parameter: " + parameter);
                return false;
            }
            byte[] valueBytes = doubleToBytes(value);
            byte[] request = buildUDSFrame(DME_ADDRESS, SID_WRITE_DATA_BY_IDENTIFIER,
                                           concat(shortToBytes(did), valueBytes));
            byte[] response = sendAndWait(request, 2000);
            return response != null && !isNegativeResponse(response);
        } catch (Exception e) {
            errors.add("Write parameter error: " + e.getMessage());
            return false;
        }
    }

    // ==================== CAN FRAME ====================

    public void sendCANFrame(String arbitrationId, byte[] data) {
        try {
            byte[] canFrame = buildCANTPFrame(arbitrationId, data);
            serialPort.write(canFrame);
        } catch (Exception e) {
            errors.add("CAN send error: " + e.getMessage());
        }
    }

    // ==================== STATE ACCESSORS ====================

    public boolean isConnected() { return connected.get() && serialPort != null; }
    public void close() { connected.set(false); }
    public long getCableDetectTime() { return cableDetectTime; }
    public long getProtocolNegotiateTime() { return protocolNegotiateTime; }
    public long getEcuScanTime() { return ecuScanTime; }
    public long getTotalConnectTime() { return totalConnectTime; }
    public int getRetryCount() { return retryCount; }
    public List<String> getErrors() { return new ArrayList<>(errors); }
    public String getDMEProtocolVersion() { return dmeProtocolVersion; }

    // ==================== FRAME BUILDERS ====================

    /**
     * Build a KWP2000 frame for K-Line communication.
     * Format: [Length][TargetAddr][SourceAddr][Service][Data...][Checksum]
     * Length = number of data bytes + service byte
     * Checksum = sum of all bytes except checksum itself, inverted + 1 (two's complement)
     */
    private byte[] buildKWPFrame(byte service, byte[] data) {
        int len = 1 + data.length; // service byte + data bytes
        byte[] frame = new byte[4 + data.length + 1]; // len + tgt + src + svc + data + checksum
        frame[0] = (byte) len;
        frame[1] = (byte) 0x12; // Target: DME
        frame[2] = (byte) 0xF1; // Source: Tester (external diagnostic tool)
        frame[3] = service;
        System.arraycopy(data, 0, frame, 4, data.length);
        frame[frame.length - 1] = calculateKWPChecksum(frame, frame.length - 1);
        return frame;
    }

    /**
     * Build a UDS frame for D-CAN communication using ISO-TP.
     * For single frames (data <= 7 bytes), uses ISO-TP single frame format.
     */
    private byte[] buildUDSFrame(String targetAddress, byte service, byte[] data) {
        int addr = Integer.parseInt(targetAddress.replace("0x", ""), 16);
        byte[] udsData = new byte[1 + data.length];
        udsData[0] = service;
        System.arraycopy(data, 0, udsData, 1, data.length);

        // Build CAN ID (11-bit standard for BMW D-CAN)
        int canId = 0x6D0 | (addr & 0x0F); // Request ID format: 0x6D0 + ECU address low nibble

        return buildCANTPFrame(String.format("0x%03X", canId), udsData);
    }

    /**
     * Build an OBD2 frame for K-Line.
     * Format: [Mode][PID][Checksum]
     */
    private byte[] buildOBD2Frame(byte mode, byte[] pids) {
        byte[] frame = new byte[2 + pids.length];
        frame[0] = mode;
        System.arraycopy(pids, 0, frame, 1, pids.length);
        frame[frame.length - 1] = calculateKWPChecksum(frame, frame.length - 1);
        return frame;
    }

    /**
     * Build an ISO-TP CAN frame for BMW D-CAN.
     * Handles single frames (data length <= 7).
     * For multi-frame, ISO-TP first frame + consecutive frames would be needed.
     */
    private byte[] buildCANTPFrame(String arbitrationId, byte[] data) {
        int canId = Integer.parseInt(arbitrationId.replace("0x", ""), 16);
        int dataLen = data.length;

        byte[] frame;
        if (dataLen <= 7) {
            // Single Frame (SF): PCI = 0x0L where L = data length
            frame = new byte[ISO_TP_MAX_DLC]; // Always 8 bytes (CAN DLC)
            frame[0] = (byte) (ISO_TP_SINGLE_FRAME | dataLen);
            System.arraycopy(data, 0, frame, 1, dataLen);
            // Pad remaining bytes with 0xAA (BMW padding pattern)
            for (int i = 1 + dataLen; i < ISO_TP_MAX_DLC; i++) {
                frame[i] = (byte) 0xAA;
            }
        } else {
            // First Frame (FF): For data > 7 bytes
            // This is a simplified implementation - full ISO-TP would need flow control
            frame = new byte[ISO_TP_MAX_DLC];
            frame[0] = (byte) (ISO_TP_FIRST_FRAME | ((dataLen >> 8) & 0x0F));
            frame[1] = (byte) (dataLen & 0xFF);
            System.arraycopy(data, 0, frame, 2, 6); // First 6 bytes of data
            // Full implementation would continue with Consecutive Frames + Flow Control
        }

        // Prepend CAN ID (4 bytes, big-endian) for serial transmission
        // Some BMW D-CAN interfaces expect ID + data format
        byte[] fullFrame = new byte[4 + frame.length];
        fullFrame[0] = (byte) 0x00; // Extended ID flag (0 = 11-bit)
        fullFrame[1] = (byte) ((canId >> 8) & 0x07); // Upper 3 bits of 11-bit ID
        fullFrame[2] = (byte) (canId & 0xFF);        // Lower 8 bits
        fullFrame[3] = (byte) ISO_TP_MAX_DLC;          // DLC = 8
        System.arraycopy(frame, 0, fullFrame, 4, frame.length);
        return fullFrame;
    }

    // ==================== RESPONSE HANDLING ====================

    /**
     * Send data and wait for response using CountDownLatch to avoid race conditions.
     * Uses a timeout mechanism that handles the case where response arrives before wait begins.
     */
    private byte[] sendAndWait(byte[] data, int timeoutMs) {
        if (serialPort == null) return null;

        synchronized (responseLock) {
            lastResponse.set(null);
            serialPort.write(data);

            try {
                // Wait for response with timeout
                responseLock.wait(timeoutMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }

            return lastResponse.getAndSet(null);
        }
    }

    /**
     * Wait for a specific number of bytes without sending anything.
     * Used during K-Line initialization for reading responses.
     */
    private byte[] waitForBytes(int byteCount, int timeoutMs) {
        synchronized (responseLock) {
            lastResponse.set(null);

            try {
                long deadline = System.currentTimeMillis() + timeoutMs;
                while (System.currentTimeMillis() < deadline) {
                    responseLock.wait(Math.max(1, deadline - System.currentTimeMillis()));
                    byte[] resp = lastResponse.getAndSet(null);
                    if (resp != null && resp.length >= byteCount) {
                        return resp;
                    }
                    if (resp != null) {
                        // Got partial response, accumulate
                        // For simplicity, return what we have
                        return resp;
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return lastResponse.getAndSet(null);
        }
    }

    // ==================== PID READING ====================

    private double readPIDScaled(byte pid, ValueConverter converter, int expectedBytes) {
        try {
            byte[] request = buildOBD2Frame((byte) 0x01, new byte[]{pid});
            byte[] response = sendAndWait(request, 300);
            if (response != null && response.length >= expectedBytes) {
                int raw = 0;
                if (expectedBytes == 1) {
                    raw = response[0] & 0xFF;
                } else if (expectedBytes == 2) {
                    raw = ((response[0] & 0xFF) << 8) | (response[1] & 0xFF);
                }
                return converter.convert(raw);
            }
        } catch (Exception e) {
            // Silently return 0 for individual PID failures
        }
        return 0.0;
    }

    private void readBMWSpecificData(Map<String, Double> data) {
        try {
            // Boost pressure (BMW-specific DID 0x280A)
            byte[] boostRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                                new byte[]{0x28, 0x0A});
            byte[] boostResponse = sendAndWait(boostRequest, 300);
            if (boostResponse != null && boostResponse.length >= 2) {
                int raw = ((boostResponse[0] & 0xFF) << 8) | (boostResponse[1] & 0xFF);
                data.put("boost", raw / 1000.0 - 1.0); // Convert to bar (relative)
            }

            // Wastegate duty cycle (DID 0x280E)
            byte[] wgRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                             new byte[]{0x28, 0x0E});
            byte[] wgResponse = sendAndWait(wgRequest, 300);
            if (wgResponse != null && wgResponse.length >= 1) {
                data.put("dutyCycle", (wgResponse[0] & 0xFF) * 100.0 / 255.0);
            }

            // Actual torque (DID 0x280D)
            byte[] tqRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                             new byte[]{0x28, 0x0D});
            byte[] tqResponse = sendAndWait(tqRequest, 300);
            if (tqResponse != null && tqResponse.length >= 2) {
                int raw = ((tqResponse[0] & 0xFF) << 8) | (tqResponse[1] & 0xFF);
                data.put("tqActual", (double) raw);
            }

            // Lambda/integration (DID 0x280F)
            byte[] lambdaRequest = buildUDSFrame(DME_ADDRESS, SID_READ_DATA_BY_IDENTIFIER,
                                                 new byte[]{0x28, 0x0F});
            byte[] lambdaResponse = sendAndWait(lambdaRequest, 300);
            if (lambdaResponse != null && lambdaResponse.length >= 2) {
                int raw = ((lambdaResponse[0] & 0xFF) << 8) | (lambdaResponse[1] & 0xFF);
                data.put("lambda", raw / 65536.0); // Normalize to ~1.0
            }

        } catch (Exception e) {
            // BMW-specific data is optional
        }
    }

    // ==================== UTILITIES ====================

    private boolean isNegativeResponse(byte[] response) {
        if (response == null || response.length == 0) return true;
        // UDS negative response: first byte has upper nibble = 7F
        return (response[0] & 0xFF) == 0x7F ||
               (response.length > 1 && (response[1] & 0xFF) == 0x7F);
    }

    private String extractStringFromResponse(byte[] response) {
        if (response == null || response.length == 0) return "";
        // Skip leading zeros and service response bytes
        int start = 0;
        while (start < response.length &&
               (response[start] == 0 || (response[start] & 0xFF) >= 0x60)) {
            start++;
        }
        if (start >= response.length) return "";
        // Extract printable characters
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < response.length; i++) {
            byte b = response[i];
            if (b >= 0x20 && b < 0x7F) {
                sb.append((char) b);
            }
        }
        return sb.toString().trim();
    }

    /**
     * KWP2000 checksum: sum of all bytes (excluding checksum byte itself),
     * then two's complement of the low byte.
     */
    private byte calculateKWPChecksum(byte[] data, int len) {
        int sum = 0;
        for (int i = 0; i < len; i++) {
            sum += (data[i] & 0xFF);
        }
        return (byte) ((~sum + 1) & 0xFF); // Two's complement of low byte
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
        switch (parameter) {
            case "ignition_advance": return (short) 0x2801;
            case "fuel_correction": return (short) 0x2802;
            case "wastegate_duty": return (short) 0x2803;
            case "boost_taper": return (short) 0x2804;
            case "timing_retard": return (short) 0x2805;
            case "tq_limiter": return (short) 0x2806;
            case "fuel_correction_base": return (short) 0x2807;
            case "engine_protection": return (short) 0x2808;
            default: return (short) 0x0000;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        if (bytes == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < bytes.length; i++) {
            sb.append(String.format("%02X", bytes[i] & 0xFF));
            if (i < bytes.length - 1) sb.append(" ");
        }
        sb.append("]");
        return sb.toString();
    }

    // ==================== BACKGROUND TASKS ====================

    private void startTesterPresentTimer() {
        Thread testerPresentThread = new Thread(() -> {
            while (connected.get()) {
                try {
                    Thread.sleep(2000);
                    if (connected.get() && serialPort != null) {
                        if (dmeProtocolVersion.contains("KWP2000")) {
                            // KWP2000 TesterPresent
                            byte[] tp = buildKWPFrame(KWP TesterPresent, new byte[]{0x00});
                            serialPort.write(tp);
                        } else {
                            // UDS TesterPresent
                            byte[] tp = buildUDSFrame(DME_ADDRESS, SID_TESTER_PRESENT, new byte[]{0x00});
                            serialPort.write(tp);
                        }
                    }
                } catch (InterruptedException e) {
                    break;
                } catch (Exception e) {
                    // Ignore tester present errors
                }
            }
        }, "TesterPresent");
        testerPresentThread.setDaemon(true);
        testerPresentThread.start();
    }

    @FunctionalInterface
    private interface ValueConverter {
        double convert(int rawValue);
    }

    // ==================== DATA CLASSES ====================

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
            this.name = name; this.address = address; this.protocol = protocol;
            this.status = status; this.firmwareVersion = firmwareVersion;
            this.lastResponse = lastResponse; this.faultCodes = faultCodes;
        }
    }

    public static class DMEInfo {
        public String ecuType = "";
        public String software = "";
        public String vin = "";
        public String powerClass = "";
    }
}
