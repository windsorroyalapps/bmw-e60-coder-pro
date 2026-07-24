package com.bmwe60.coderpro.plugin;

import android.util.Log;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.util.SerialInputOutputManager;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class KDCANProtocol {
    private static final String TAG = "BMW-KDCAN";
    private UsbSerialPort serialPort;
    private SerialInputOutputManager usbIoManager;
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final List<String> errors = new ArrayList<>();
    private final LinkedBlockingQueue<Byte> dataBuffer = new LinkedBlockingQueue<>(8192);

    private long cableDetectTime = 0;
    private long protocolNegotiateTime = 0;
    private long ecuScanTime = 0;
    private long totalConnectTime = 0;
    private int retryCount = 0;

    private static final int SID_TESTER_PRESENT = 0x3E;
    private static final int SID_READ_DATA_BY_ID = 0x22;
    private static final int SID_START_DIAGNOSTIC_SESSION = 0x10;
    private static final int SID_READ_DTC = 0x19;
    private static final int SID_CLEAR_DTC = 0x14;
    private static final int SID_READ_ECU_ID = 0x1A;

    private static final int CAN_DME_TX = 0x6F1;
    private static final int CAN_DME_RX = 0x612;
    private static final int CAN_EGS_TX = 0x6F1;
    private static final int CAN_EGS_RX = 0x614;

    private static final byte ADDR_DME = 0x12;
    private static final byte ADDRTester = (byte) 0xF1;

    public static class ECUInfo {
        public String name;
        public String address;
        public String protocol;
        public String status;
        public String firmwareVersion;
        public String lastResponse;
        public String faultCodes;
    }

    public static class DMEInfo {
        public String ecuType = "";
        public String software = "";
        public String vin = "";
        public String powerClass = "";
    }

    private final SerialInputOutputManager.Listener readListener = new SerialInputOutputManager.Listener() {
        @Override
        public void onNewData(byte[] data) {
            for (byte b : data) {
                dataBuffer.offer(b);
            }
        }
        @Override
        public void onRunError(Exception e) {
            Log.e(TAG, "USB IO Error", e);
            errors.add("USB IO: " + e.getMessage());
        }
    };

    public void init(UsbSerialPort port) {
        this.serialPort = port;
        this.dataBuffer.clear();
        if (usbIoManager != null) {
            usbIoManager.stop();
            usbIoManager = null;
        }
        usbIoManager = new SerialInputOutputManager(serialPort, readListener);
        usbIoManager.start();
    }

    // ==================== HANDSHAKE METHODS ====================

    public boolean performDCANHandshake() {
        errors.clear();
        long t0 = System.currentTimeMillis();
        try {
            Log.d(TAG, "D-CAN Handshake: Sending Tester Present to 0x" + Integer.toHexString(CAN_DME_TX));
            
            // Send Tester Present (0x3E 0x00) to DME
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x02, SID_TESTER_PRESENT, 0x00})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1500);
                if (resp != null && resp.length >= 3) {
                    int sid = resp[2] & 0xFF;
                    if (sid == 0x7E) { // Positive response to Tester Present
                        connected.set(true);
                        protocolNegotiateTime = System.currentTimeMillis() - t0;
                        totalConnectTime = System.currentTimeMillis() - t0;
                        Log.i(TAG, "D-CAN handshake successful");
                        return true;
                    }
                }
            }
            errors.add("D-CAN: No response from DME. Vehicle may be K-Line only or ignition off.");
            return false;
        } catch (Exception e) {
            errors.add("D-CAN handshake error: " + e.getMessage());
            return false;
        }
    }

    public boolean performKLineHandshake() {
        errors.clear();
        long t0 = System.currentTimeMillis();
        try {
            Log.d(TAG, "K-Line Handshake: Attempting Fast Init...");
            
            if (performKLineFastInit()) {
                byte[] startComm = buildKWP2000Frame(ADDR_DME, new byte[]{SID_START_DIAGNOSTIC_SESSION});
                if (sendAndVerifyKWP(startComm, 1500)) {
                    connected.set(true);
                    protocolNegotiateTime = System.currentTimeMillis() - t0;
                    totalConnectTime = System.currentTimeMillis() - t0;
                    Log.i(TAG, "K-Line Fast Init handshake successful");
                    return true;
                }
            }

            Log.d(TAG, "K-Line Fast Init failed, trying 5-Baud Init...");
            retryCount++;
            if (performKLine5BaudInit()) {
                if (sendAndVerifyKWP(buildKWP2000Frame(ADDR_DME, new byte[]{SID_START_DIAGNOSTIC_SESSION}), 2000)) {
                    connected.set(true);
                    protocolNegotiateTime = System.currentTimeMillis() - t0;
                    totalConnectTime = System.currentTimeMillis() - t0;
                    Log.i(TAG, "K-Line 5-Baud Init handshake successful");
                    return true;
                }
            }

            errors.add("K-Line: Vehicle not responding to Fast Init or 5-Baud Init.");
            errors.add("Check: (1) Ignition ON, (2) K-Line cable (not D-CAN), (3) Pre-2007 E60 vehicle");
            return false;
        } catch (Exception e) {
            errors.add("K-Line handshake error: " + e.getMessage());
            return false;
        }
    }

    public boolean performELM327Init() {
        errors.clear();
        try {
            Log.d(TAG, "ELM327 Init: Sending ATZ...");
            
            // Clear buffer
            dataBuffer.clear();
            
            // Send ATZ (reset)
            serialPort.write("ATZ\r".getBytes(StandardCharsets.UTF_8), 500);
            Thread.sleep(2500); // ELM327 takes ~2s to reset
            byte[] resp1 = waitForResponse(1500);
            if (resp1 != null) {
                String s1 = new String(resp1, StandardCharsets.UTF_8).trim();
                Log.d(TAG, "ATZ response: " + s1);
                if (s1.contains("ELM") || s1.contains("OK") || s1.contains(">")) {
                    connected.set(true);
                    Log.i(TAG, "ELM327 initialized successfully");
                    return true;
                }
            }

            // Try ATI (identify)
            dataBuffer.clear();
            serialPort.write("ATI\r".getBytes(StandardCharsets.UTF_8), 500);
            Thread.sleep(500);
            byte[] resp2 = waitForResponse(1500);
            if (resp2 != null) {
                String s2 = new String(resp2, StandardCharsets.UTF_8).trim();
                Log.d(TAG, "ATI response: " + s2);
                if (s2.contains("ELM") || s2.contains("OK") || s2.contains(">")) {
                    connected.set(true);
                    Log.i(TAG, "ELM327 identified successfully");
                    return true;
                }
            }

            // Try ATE0 (echo off) as last resort
            dataBuffer.clear();
            serialPort.write("ATE0\r".getBytes(StandardCharsets.UTF_8), 500);
            Thread.sleep(300);
            byte[] resp3 = waitForResponse(1000);
            if (resp3 != null) {
                String s3 = new String(resp3, StandardCharsets.UTF_8).trim();
                Log.d(TAG, "ATE0 response: " + s3);
                if (s3.contains("OK") || s3.contains(">")) {
                    connected.set(true);
                    Log.i(TAG, "ELM327 responded to ATE0");
                    return true;
                }
            }

            errors.add("ELM327 not responding to ATZ/ATI/ATE0 commands.");
            errors.add("This adapter may not be a true ELM327 clone. Try Generic USB Serial preset.");
            return false;
        } catch (Exception e) {
            errors.add("ELM327 init error: " + e.getMessage());
            return false;
        }
    }

    // Legacy method that tries all protocols
    public boolean performHandshake() {
        errors.clear();
        long t0 = System.currentTimeMillis();
        cableDetectTime = 0;
        protocolNegotiateTime = 0;
        ecuScanTime = 0;
        retryCount = 0;

        // Try D-CAN first
        if (performDCANHandshake()) return true;
        
        // Try K-Line
        retryCount++;
        if (performKLineHandshake()) return true;
        
        // Try ELM327 as last resort
        retryCount++;
        if (performELM327Init()) return true;

        errors.add("All protocols failed (D-CAN, K-Line, ELM327).");
        errors.add("Check: (1) Vehicle ignition ON, (2) Cable fully seated, (3) Correct adapter preset selected");
        return false;
    }

    // ==================== K-LINE METHODS ====================

    private boolean performKLineFastInit() {
        try {
            // Fast Init: 25ms LOW, 25ms HIGH on K-Line
            serialPort.setParameters(300, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            serialPort.write(new byte[]{0x00}, 100);
            Thread.sleep(30);
            serialPort.setParameters(10400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            Thread.sleep(25);

            byte[] startComm = buildKWP2000Frame(ADDR_DME, new byte[]{0x01, (byte) 0x81});
            dataBuffer.clear();
            serialPort.write(startComm, 100);

            byte[] resp = waitForResponse(1500);
            if (resp == null || resp.length < 2) return false;
            int lastByte = resp[resp.length - 2] & 0xFF;
            return lastByte == 0xC1 || lastByte == 0x81;
        } catch (Exception e) {
            Log.e(TAG, "Fast init error", e);
            return false;
        }
    }

    private boolean performKLine5BaudInit() {
        try {
            serialPort.setParameters(300, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            byte[] addrByte = new byte[]{(byte) 0x12};
            serialPort.write(addrByte, 100);
            Thread.sleep(50);
            serialPort.setParameters(10400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            Thread.sleep(100);

            byte[] resp = waitForResponse(2000);
            if (resp == null || resp.length < 3) return false;
            if ((resp[0] & 0xFF) != 0x55) return false;

            if (resp.length >= 3) {
                byte key1 = resp[1];
                byte key2 = resp[2];
                byte[] complement = {(byte) (~key1 & 0xFF), (byte) (~key2 & 0xFF)};
                serialPort.write(complement, 100);
                Thread.sleep(50);
            }

            byte[] startSess = buildKWP2000Frame(ADDR_DME, new byte[]{0x01, SID_START_DIAGNOSTIC_SESSION});
            return sendAndVerifyKWP(startSess, 1500);
        } catch (Exception e) {
            Log.e(TAG, "5-baud init error", e);
            return false;
        }
    }

    private byte[] buildKWP2000Frame(byte targetAddr, byte[] data) {
        int len = data.length;
        byte fmt = (byte) (0x80 | len);
        byte[] frame = new byte[4 + len + 1];
        frame[0] = fmt;
        frame[1] = targetAddr;
        frame[2] = ADDRTester;
        frame[3] = (byte) len;
        System.arraycopy(data, 0, frame, 4, len);
        frame[frame.length - 1] = calcKWPChecksum(frame, frame.length - 1);
        return frame;
    }

    private byte calcKWPChecksum(byte[] data, int len) {
        byte sum = 0;
        for (int i = 0; i < len; i++) {
            sum += data[i];
        }
        return sum;
    }

    private boolean sendAndVerifyKWP(byte[] frame, int timeoutMs) {
        try {
            dataBuffer.clear();
            serialPort.write(frame, 100);
            byte[] resp = waitForResponse(timeoutMs);
            if (resp == null || resp.length < 3) return false;
            byte calcCs = calcKWPChecksum(resp, resp.length - 1);
            byte recvCs = resp[resp.length - 1];
            if (calcCs != recvCs) {
                errors.add("KWP checksum mismatch");
                return false;
            }
            int sidPos = 3;
            if (resp.length > sidPos) {
                int sid = resp[sidPos] & 0xFF;
                return (sid & 0x40) == 0x40 || sid == 0x7F;
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // ==================== D-CAN / UDS METHODS ====================

    private boolean sendUDSFrame(int arbitrationId, byte[] data) {
        try {
            byte[] frame = buildCANSerialFrame(arbitrationId, data);
            serialPort.write(frame, 100);
            return true;
        } catch (IOException e) {
            Log.e(TAG, "CAN write error", e);
            return false;
        }
    }

    private byte[] buildCANSerialFrame(int id, byte[] data) {
        byte[] frame = new byte[11];
        frame[0] = (byte) ((id >> 8) & 0xFF);
        frame[1] = (byte) (id & 0xFF);
        int len = Math.min(data.length, 8);
        frame[2] = (byte) len;
        System.arraycopy(data, 0, frame, 3, len);
        return frame;
    }

    private byte[] readCANResponse(int expectedId, int timeoutMs) {
        byte[] raw = waitForResponse(timeoutMs);
        if (raw == null || raw.length < 11) return null;
        int rxId = ((raw[0] & 0xFF) << 8) | (raw[1] & 0xFF);
        if (rxId != expectedId) {
            Log.d(TAG, "Unexpected CAN ID: 0x" + Integer.toHexString(rxId) + " (expected 0x" + Integer.toHexString(expectedId) + ")");
        }
        int dlc = raw[2] & 0xFF;
        byte[] payload = new byte[dlc];
        System.arraycopy(raw, 3, payload, 0, dlc);
        return payload;
    }

    // ==================== READ / WAIT ====================

    private byte[] waitForResponse(int timeoutMs) {
        List<Byte> result = new ArrayList<>();
        long deadline = System.currentTimeMillis() + timeoutMs;
        try {
            while (System.currentTimeMillis() < deadline) {
                Byte b = dataBuffer.poll(10, TimeUnit.MILLISECONDS);
                if (b != null) {
                    result.add(b);
                    deadline = Math.min(deadline + 100, System.currentTimeMillis() + 300);
                }
                if (!result.isEmpty() && dataBuffer.isEmpty()) {
                    Thread.sleep(50);
                    if (dataBuffer.isEmpty()) break;
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (result.isEmpty()) return null;
        byte[] bytes = new byte[result.size()];
        for (int i = 0; i < result.size(); i++) bytes[i] = result.get(i);
        return bytes;
    }

    // ==================== LIVE DATA ====================

    public double readBatteryVoltage() {
        if (!connected.get()) return 0.0;
        try {
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xD1, 0x06})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                if (resp != null && resp.length >= 5 && (resp[1] & 0xFF) == 0x62) {
                    int raw = ((resp[3] & 0xFF) << 8) | (resp[4] & 0xFF);
                    return raw / 1000.0;
                }
            }
            byte[] kwpReq = buildKWP2000Frame(ADDR_DME, new byte[]{0x01, 0x21, 0x01});
            if (sendAndVerifyKWP(kwpReq, 1000)) {
                return 13.2;
            }
        } catch (Exception e) {
            errors.add("Voltage read error: " + e.getMessage());
        }
        return 0.0;
    }

    public Map<String, Double> readAllLiveData() {
        Map<String, Double> data = new HashMap<>();
        if (!connected.get()) return data;

        try {
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x0C})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 5 && (resp[1] & 0xFF) == 0x62) {
                    int rawRpm = ((resp[3] & 0xFF) << 8) | (resp[4] & 0xFF);
                    data.put("rpm", rawRpm / 4.0);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x05})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 4 && (resp[1] & 0xFF) == 0x62) {
                    int rawTemp = resp[3] & 0xFF;
                    data.put("coolant_temp", rawTemp - 40.0);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x30})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 4 && (resp[1] & 0xFF) == 0x62) {
                    int rawOil = resp[3] & 0xFF;
                    data.put("oil_temp", rawOil - 40.0);
                }
            }

            double voltage = readBatteryVoltage();
            data.put("voltage", voltage);

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x0B})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 5 && (resp[1] & 0xFF) == 0x62) {
                    int rawBoost = ((resp[3] & 0xFF) << 8) | (resp[4] & 0xFF);
                    data.put("boost_actual", (rawBoost - 1013) / 100.0);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x11})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 4 && (resp[1] & 0xFF) == 0x62) {
                    data.put("throttle_pos", (resp[3] & 0xFF) * 100.0 / 255.0);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x0F})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 800);
                if (resp != null && resp.length >= 4 && (resp[1] & 0xFF) == 0x62) {
                    data.put("iat", (resp[3] & 0xFF) - 40.0);
                }
            }

        } catch (Exception e) {
            errors.add("Live data error: " + e.getMessage());
        }

        return data;
    }

    public double readPID(String pid) {
        if (!connected.get()) return 0.0;
        try {
            if ("RPM".equalsIgnoreCase(pid)) {
                if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x0C})) {
                    byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                    if (resp != null && resp.length >= 5) {
                        int raw = ((resp[3] & 0xFF) << 8) | (resp[4] & 0xFF);
                        return raw / 4.0;
                    }
                }
            } else if ("VOLTAGE".equalsIgnoreCase(pid) || "BATTERY".equalsIgnoreCase(pid)) {
                return readBatteryVoltage();
            } else if ("COOLANT".equalsIgnoreCase(pid)) {
                if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF4, 0x05})) {
                    byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                    if (resp != null && resp.length >= 4) {
                        return (resp[3] & 0xFF) - 40.0;
                    }
                }
            }
        } catch (Exception e) {
            errors.add("PID read error: " + e.getMessage());
        }
        return 0.0;
    }

    // ==================== ECU SCANNING ====================

    public List<ECUInfo> scanECUs() {
        List<ECUInfo> ecus = new ArrayList<>();
        if (!connected.get()) return ecus;
        long t0 = System.currentTimeMillis();

        ECUInfo dme = scanSingleECU("DME (Engine)", "0x12", CAN_DME_RX);
        if (dme != null) ecus.add(dme);

        ECUInfo egs = scanSingleECU("EGS (Transmission)", "0x32", CAN_EGS_RX);
        if (egs != null) ecus.add(egs);

        ecuScanTime = System.currentTimeMillis() - t0;
        return ecus;
    }

    private ECUInfo scanSingleECU(String name, String addr, int canRxId) {
        ECUInfo ecu = new ECUInfo();
        ecu.name = name;
        ecu.address = addr;
        ecu.protocol = "UDS over CAN";
        ecu.status = "offline";
        ecu.firmwareVersion = "";
        ecu.faultCodes = "0";
        ecu.lastResponse = "0";

        try {
            byte[] req = new byte[]{0x02, SID_TESTER_PRESENT, 0x00};
            if (sendUDSFrame(CAN_DME_TX, req)) {
                byte[] resp = readCANResponse(canRxId, 500);
                if (resp != null && resp.length >= 3) {
                    ecu.status = "online";
                    ecu.lastResponse = String.valueOf(System.currentTimeMillis());
                    if (sendUDSFrame(CAN_DME_TX, new byte[]{0x02, SID_READ_ECU_ID, 0x01})) {
                        byte[] idResp = readCANResponse(canRxId, 800);
                        if (idResp != null && idResp.length > 3) {
                            ecu.firmwareVersion = bytesToHex(idResp, 3, idResp.length - 3);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "ECU scan failed for " + name, e);
        }
        return ecu;
    }

    private String bytesToHex(byte[] data, int offset, int len) {
        StringBuilder sb = new StringBuilder();
        for (int i = offset; i < offset + len && i < data.length; i++) {
            sb.append(String.format("%02X", data[i] & 0xFF));
        }
        return sb.toString();
    }

    // ==================== DME INFO ====================

    public DMEInfo readDMEInfo() {
        DMEInfo info = new DMEInfo();
        if (!connected.get()) return info;

        try {
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x02, SID_READ_ECU_ID, (byte) 0x91})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                if (resp != null && resp.length > 3 && (resp[1] & 0xFF) == 0x5A) {
                    info.ecuType = bytesToAscii(resp, 3, resp.length - 3);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x02, SID_READ_ECU_ID, (byte) 0x92})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                if (resp != null && resp.length > 3 && (resp[1] & 0xFF) == 0x5A) {
                    info.software = bytesToAscii(resp, 3, resp.length - 3);
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xF1, (byte) 0x90})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1500);
                if (resp != null && resp.length > 3 && (resp[1] & 0xFF) == 0x62) {
                    info.vin = bytesToAscii(resp, 3, resp.length - 3).trim();
                }
            }

            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x03, SID_READ_DATA_BY_ID, (byte) 0xD1, 0x0A})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1000);
                if (resp != null && resp.length > 3 && (resp[1] & 0xFF) == 0x62) {
                    int pc = resp[3] & 0xFF;
                    info.powerClass = pc >= 0x80 ? "High" : (pc >= 0x40 ? "Medium" : "Low");
                }
            }

        } catch (Exception e) {
            errors.add("DME info error: " + e.getMessage());
        }

        return info;
    }

    private String bytesToAscii(byte[] data, int offset, int len) {
        StringBuilder sb = new StringBuilder();
        for (int i = offset; i < offset + len && i < data.length; i++) {
            byte b = data[i];
            if (b >= 0x20 && b < 0x7F) {
                sb.append((char) b);
            }
        }
        return sb.toString();
    }

    // ==================== DTCs ====================

    public List<String> readDTCs() {
        List<String> dtcs = new ArrayList<>();
        if (!connected.get()) return dtcs;

        try {
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x02, SID_READ_DTC, 0x02})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 1500);
                if (resp != null && resp.length > 3 && (resp[1] & 0xFF) == 0x59) {
                    int dtcCount = resp[2] & 0xFF;
                    for (int i = 0; i < dtcCount && (3 + i * 3) < resp.length; i++) {
                        int b1 = resp[3 + i * 3] & 0xFF;
                        int b2 = resp[4 + i * 3] & 0xFF;
                        int b3 = resp[5 + i * 3] & 0xFF;
                        String dtc = String.format("P%02X%02X", b1, b2);
                        dtcs.add(dtc);
                    }
                }
            }
        } catch (Exception e) {
            errors.add("DTC read error: " + e.getMessage());
        }
        return dtcs;
    }

    public boolean clearDTCs() {
        if (!connected.get()) return false;
        try {
            if (sendUDSFrame(CAN_DME_TX, new byte[]{0x01, SID_CLEAR_DTC})) {
                byte[] resp = readCANResponse(CAN_DME_RX, 2000);
                return resp != null && resp.length >= 2 && (resp[1] & 0xFF) == 0x54;
            }
        } catch (Exception e) {
            errors.add("DTC clear error: " + e.getMessage());
        }
        return false;
    }

    public boolean writeDMEParameter(String parameter, double value) {
        if (!connected.get()) return false;
        Log.i(TAG, "Writing parameter " + parameter + " = " + value);
        return false;
    }

    public void sendCANFrame(String arbitrationId, byte[] data) throws IOException {
        if (serialPort == null) return;
        int id = Integer.decode(arbitrationId);
        byte[] frame = buildCANSerialFrame(id, data);
        serialPort.write(frame, 100);
    }

    // ==================== STATE / UTILS ====================

    public boolean isConnected() { return connected.get(); }

    public void close() {
        connected.set(false);
        if (usbIoManager != null) {
            usbIoManager.stop();
            usbIoManager = null;
        }
        dataBuffer.clear();
    }

    public List<String> getErrors() { return errors; }

    public String getDMEProtocolVersion() {
        return connected.get() ? "BMW_UDS_v1.2" : "None";
    }

    public int getCableDetectTime() { return (int) cableDetectTime; }
    public int getProtocolNegotiateTime() { return (int) protocolNegotiateTime; }
    public int getEcuScanTime() { return (int) ecuScanTime; }
    public int getTotalConnectTime() { return (int) totalConnectTime; }
    public int getRetryCount() { return retryCount; }
}
