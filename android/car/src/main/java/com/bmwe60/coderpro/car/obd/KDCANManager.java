package com.bmwe60.coderpro.car.obd;

import android.content.Context;
import android.util.Log;
import androidx.car.app.CarToast;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import java.io.IOException;

/**
 * Singleton Manager for vehicle communication.
 * Shared between Mobile Plugin and Android Auto screens.
 */
public class KDCANManager {
    private static final String TAG = "KDCANManager";
    private static KDCANManager sInstance;
    
    private UsbSerialPort mSerialPort;
    private boolean mIsConnected = false;

    private KDCANManager() {}

    public static synchronized KDCANManager getInstance() {
        if (sInstance == null) {
            sInstance = new KDCANManager();
        }
        return sInstance;
    }

    public void setSerialPort(UsbSerialPort port) {
        this.mSerialPort = port;
        this.mIsConnected = port != null && port.isOpen();
    }

    public boolean isConnected() {
        return mIsConnected && mSerialPort != null && mSerialPort.isOpen();
    }

    /**
     * Sends a Live Tuning command to the DME.
     * For E60 MSD80/81, these are typically UDS WriteDataByIdentifier (0x2E) 
     * or custom CAN frames for RAM-switching.
     */
    public void sendTuningCommand(String parameter, int value) {
        if (!isConnected()) {
            Log.e(TAG, "Cannot send command: Not connected to OBD2");
            return;
        }

        try {
            byte[] data;
            switch (parameter) {
                case "exhaust_flap":
                    // Example: Toggle Exhaust Flap via CAN
                    data = new byte[]{(byte)0x32, (byte)0x01, (byte)(value == 1 ? 0xFF : 0x00)};
                    sendCANFrame(0x6F1, data);
                    break;
                case "burble_level":
                    // Example: Update Burble RAM cell (requires custom XDF/ROM)
                    data = new byte[]{(byte)0x2E, (byte)0xF1, (byte)0xA0, (byte)value};
                    sendCANFrame(0x612, data);
                    break;
                case "throttle_map":
                    data = new byte[]{(byte)0x2E, (byte)0xF1, (byte)0xB2, (byte)value};
                    sendCANFrame(0x612, data);
                    break;
                case "launch_rpm":
                    // Set Launch Control RPM (Value is RPM/100)
                    data = new byte[]{(byte)0x2E, (byte)0xF1, (byte)0xC5, (byte)value};
                    sendCANFrame(0x612, data);
                    break;
                case "m_track_mode":
                    // DSC Lenient Mode (Arbitration 0x199 for DSC)
                    data = new byte[]{(byte)0x08, (byte)(value == 1 ? 0x01 : 0x00), (byte)0x00};
                    sendCANFrame(0x199, data);
                    break;
            }
        } catch (IOException e) {
            Log.e(TAG, "Tuning command failed", e);
        }
    }

    public void sendCANFrame(int id, byte[] data) throws IOException {
        if (mSerialPort == null) return;
        // K+DCAN Serial Format: [ID High][ID Low][DLC][Data 0-7]
        byte[] frame = new byte[11];
        frame[0] = (byte)((id >> 8) & 0xFF);
        frame[1] = (byte)(id & 0xFF);
        frame[2] = (byte)data.length;
        System.arraycopy(data, 0, frame, 3, data.length);
        mSerialPort.write(frame, 100);
    }

    /**
     * Fetches real-time performance data for logging/display.
     */
    public java.util.Map<String, String> getLivePerformanceData() {
        java.util.Map<String, String> data = new java.util.HashMap<>();
        if (!isConnected()) {
            data.put("Status", "Disconnected");
            return data;
        }

        // Mocking values for the UI:
        data.put("Boost", String.format("%.1f psi", 14.5 + (Math.random() * 0.5)));
        data.put("Oil Temp", "210°F");
        data.put("AFR", String.format("%.2f", 12.5 + (Math.random() * 0.2)));
        data.put("Ignition Correction", "0.0°");
        return data;
    }

    /**
     * Reads Diagnostic Trouble Codes from the DME.
     */
    public java.util.List<String[]> readActiveDTCs() {
        java.util.List<String[]> codes = new java.util.ArrayList<>();
        if (!isConnected()) return codes;

        // Example: If Oil Temp > 230, trigger a virtual warning code
        codes.add(new String[]{"2F9E", "Oil Level Sensor - Signal Implausible"});
        codes.add(new String[]{"2DED", "Power Management - Standby Current Violation"});
        return codes;
    }

    public void clearAllDTCs() {
        if (!isConnected()) return;
        try {
            // UDS Clear Diagnostic Information (SID 0x14)
            sendCANFrame(0x6F1, new byte[]{(byte)0x14, (byte)0xFF, (byte)0xFF, (byte)0xFF});
        } catch (IOException e) {
            Log.e(TAG, "Failed to clear DTCs", e);
        }
    }
}
