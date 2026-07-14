package com.bmwe60.coderpro.plugin;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Log;

import com.felhr.usbserial.FTDISerialDevice;
import com.felhr.usbserial.UsbSerialDevice;
import com.felhr.usbserial.UsbSerialInterface;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * USB Serial Manager for K+DCAN cables.
 * Handles detection and communication with FTDI FT232R, CH340/CH341, and CP2102 chips.
 * Provides FTDI-specific configuration: latency timer, DTR/RTS for K-Line/D-CAN switching.
 * All operations use real USB hardware - no simulation.
 */
public class UsbSerialManager {

    private static final String TAG = "BMW-OBD2-USB";
    private static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";

    // FTDI latency timer - must be 1-16ms. Lower is better for K-Line timing.
    // K-Line at 10400 baud = ~0.96ms per byte. 1ms latency gives fastest response.
    private static final int FTDI_LATENCY_TIMER_MS = 2;

    // K+DCAN cable USB IDs: vendorId, productId
    private static final Map<int[], String> KNOWN_CABLES = new HashMap<>();
    static {
        // FTDI FT232R/RL - Genuine BMW cables (e.g. BMW INPA K+DCAN)
        KNOWN_CABLES.put(new int[]{0x0403, 0x6001}, "k_dcan_ftdi");  // FT232R
        KNOWN_CABLES.put(new int[]{0x0403, 0x6010}, "k_dcan_ftdi");  // FT2232H
        KNOWN_CABLES.put(new int[]{0x0403, 0x6011}, "k_dcan_ftdi");  // FT4232H
        // FTDI FT232H
        KNOWN_CABLES.put(new int[]{0x0403, 0x6014}, "k_dcan_ftdi");  // FT232H
        // CH340/CH341 - Common clone cables
        KNOWN_CABLES.put(new int[]{0x1A86, 0x7523}, "k_dcan_ch340"); // CH340
        KNOWN_CABLES.put(new int[]{0x1A86, 0x5523}, "k_dcan_ch340"); // CH341A
        KNOWN_CABLES.put(new int[]{0x4348, 0x5523}, "k_dcan_ch340"); // CH341 (alt)
        // CP2102 - Some ENET adapters
        KNOWN_CABLES.put(new int[]{0x10C4, 0xEA60}, "enet");          // CP2102
        KNOWN_CABLES.put(new int[]{0x10C4, 0xEA70}, "enet");          // CP2105
    }

    // K-Line init baud rate (5 baud for address byte)
    private static final int KLINE_INIT_BAUD = 5;
    // K-Line communication baud rate
    private static final int KLINE_BAUD = 10400;
    // D-CAN baud rate (500 kbps per BMW spec)
    private static final int DCAN_BAUD = 500000;
    // ENET baud rate
    private static final int ENET_BAUD = 1000000;
    // Default fallback baud rate
    private static final int DEFAULT_BAUD = 115200;

    private final Context context;
    private final UsbManager usbManager;
    private UsbSerialDevice serialPort;
    private UsbDeviceConnection connection;
    private CableInfo currentCable;
    private final AtomicBoolean portOpen = new AtomicBoolean(false);
    private String currentProtocol = "none";

    // USB permission receiver
    private final BroadcastReceiver permissionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                    if (device != null) {
                        if (granted) {
                            Log.i(TAG, "USB permission granted for " + device.getDeviceName());
                        } else {
                            Log.w(TAG, "USB permission denied for " + device.getDeviceName());
                        }
                    }
                }
            }
        }
    };

    public UsbSerialManager(Context context) {
        this.context = context.getApplicationContext();
        this.usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);

        // Register USB permission receiver
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        this.context.registerReceiver(permissionReceiver, filter);
    }

    /**
     * Scan for connected K+DCAN cables.
     * Returns real detected cable or null if none found.
     */
    public CableInfo scanForCable() {
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();

        for (UsbDevice device : deviceList.values()) {
            int vendorId = device.getVendorId();
            int productId = device.getProductId();

            for (Map.Entry<int[], String> entry : KNOWN_CABLES.entrySet()) {
                int[] ids = entry.getKey();
                if (ids[0] == vendorId && ids[1] == productId) {
                    String cableType = entry.getValue();
                    boolean isGenuine = cableType.equals("k_dcan_ftdi");
                    String chipName = getChipName(vendorId, productId);
                    int baudRate = getDefaultBaudRate(cableType);

                    currentCable = new CableInfo(
                        cableType,
                        String.format("0x%04X", vendorId),
                        String.format("0x%04X", productId),
                        device.getSerialNumber(),
                        "1.0",
                        baudRate,
                        isGenuine,
                        chipName
                    );

                    Log.i(TAG, "Detected cable: " + cableType + " (" + chipName + 
                          ", VID=0x" + Integer.toHexString(vendorId) + 
                          ", PID=0x" + Integer.toHexString(productId) + ")");
                    return currentCable;
                }
            }
        }

        Log.d(TAG, "No K+DCAN cable detected");
        currentCable = null;
        return null;
    }

    /**
     * Open the USB serial port for the detected cable.
     * Configures FTDI-specific settings: latency timer, DTR/RTS for K-Line mode.
     */
    public boolean openPort() {
        if (currentCable == null) {
            Log.e(TAG, "No cable detected, cannot open port");
            return false;
        }

        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        int targetVid = Integer.parseInt(currentCable.vendorId.replace("0x", ""), 16);
        int targetPid = Integer.parseInt(currentCable.productId.replace("0x", ""), 16);

        for (UsbDevice device : deviceList.values()) {
            if (device.getVendorId() == targetVid && device.getProductId() == targetPid) {
                // Request permission if needed
                if (!usbManager.hasPermission(device)) {
                    PendingIntent permissionIntent = PendingIntent.getBroadcast(
                        context, 0, new Intent(ACTION_USB_PERMISSION), 
                        PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                    usbManager.requestPermission(device, permissionIntent);
                    Log.w(TAG, "USB permission not granted, requesting...");
                    return false;
                }

                connection = usbManager.openDevice(device);
                if (connection == null) {
                    Log.e(TAG, "Failed to open USB device connection");
                    return false;
                }

                serialPort = UsbSerialDevice.createUsbSerialDevice(device, connection);
                if (serialPort == null) {
                    Log.e(TAG, "Failed to create serial device (unsupported chip?)");
                    connection.close();
                    connection = null;
                    return false;
                }

                boolean opened = serialPort.open();
                if (!opened) {
                    Log.e(TAG, "Failed to open serial port");
                    serialPort = null;
                    connection.close();
                    connection = null;
                    return false;
                }

                // Configure serial parameters for initial communication
                int initialBaud = currentCable.baudRate;
                serialPort.setBaudRate(initialBaud);
                serialPort.setDataBits(UsbSerialInterface.DATA_BITS_8);
                serialPort.setStopBits(UsbSerialInterface.STOP_BITS_1);
                serialPort.setParity(UsbSerialInterface.PARITY_NONE);
                serialPort.setFlowControl(UsbSerialInterface.FLOW_CONTROL_OFF);

                // FTDI-specific configuration
                if (serialPort instanceof FTDISerialDevice) {
                    FTDISerialDevice ftdi = (FTDISerialDevice) serialPort;
                    try {
                        // Set latency timer to minimum for K-Line timing precision
                        // K-Line at 10400 baud = ~0.96ms per byte.
                        // 2ms latency gives fast response without excessive CPU usage.
                        ftdi.setLatencyTimer(FTDI_LATENCY_TIMER_MS);
                        Log.i(TAG, "FTDI latency timer set to " + FTDI_LATENCY_TIMER_MS + "ms");

                        // Set DTR/RTS for K-Line mode
                        // Most K+DCAN cables: DTR=high, RTS=low selects K-Line
                        // DTR=low, RTS=high selects D-CAN
                        // This matches the BMW INPA cable design
                        ftdi.setDTR(true);
                        ftdi.setRTS(false);
                        Log.i(TAG, "FTDI DTR=HIGH, RTS=LOW (K-Line mode)");
                    } catch (Exception e) {
                        Log.w(TAG, "FTDI-specific config failed: " + e.getMessage());
                    }
                }

                portOpen.set(true);
                currentProtocol = currentCable.type.equals("enet") ? "enet" : "k_dcan";

                Log.i(TAG, "Serial port opened at " + initialBaud + " baud, " +
                      "protocol=" + currentProtocol);
                return true;
            }
        }

        Log.e(TAG, "Target device not found in device list");
        return false;
    }

    /**
     * Switch between K-Line and D-CAN mode using DTR/RTS lines.
     * FTDI-based K+DCAN cables use these control lines for bus selection.
     *
     * @param mode "kline" for K-Line mode, "dcan" for D-CAN mode
     */
    public boolean setBusMode(String mode) {
        if (!(serialPort instanceof FTDISerialDevice)) {
            // CH340/CP2102 cables may not support DTR/RTS bus switching
            Log.d(TAG, "Bus mode switching not supported on non-FTDI cable");
            return false;
        }

        FTDISerialDevice ftdi = (FTDISerialDevice) serialPort;
        try {
            if ("kline".equals(mode)) {
                // K-Line mode: DTR=HIGH, RTS=LOW (typical BMW INPA cable)
                ftdi.setDTR(true);
                ftdi.setRTS(false);
                // Switch to 10400 baud for K-Line communication
                serialPort.setBaudRate(KLINE_BAUD);
                Log.i(TAG, "Switched to K-Line mode (DTR=HIGH, RTS=LOW, 10400 baud)");
            } else if ("dcan".equals(mode)) {
                // D-CAN mode: DTR=LOW, RTS=HIGH (typical BMW INPA cable)
                ftdi.setDTR(false);
                ftdi.setRTS(true);
                // Switch to 500000 baud for D-CAN communication
                serialPort.setBaudRate(DCAN_BAUD);
                Log.i(TAG, "Switched to D-CAN mode (DTR=LOW, RTS=HIGH, 500000 baud)");
            } else {
                Log.w(TAG, "Unknown bus mode: " + mode);
                return false;
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to set bus mode: " + e.getMessage());
            return false;
        }
    }

    /**
     * Set baud rate dynamically. Used by protocol layer for mode-specific rates.
     */
    public boolean setBaudRate(int baudRate) {
        if (serialPort == null || !portOpen.get()) {
            Log.w(TAG, "Cannot set baud rate: port not open");
            return false;
        }
        try {
            serialPort.setBaudRate(baudRate);
            Log.d(TAG, "Baud rate set to " + baudRate);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to set baud rate: " + e.getMessage());
            return false;
        }
    }

    /**
     * Close the USB serial port and clean up resources.
     */
    public void closePort() {
        portOpen.set(false);
        currentProtocol = "none";

        if (serialPort != null) {
            try {
                serialPort.close();
            } catch (Exception e) {
                Log.w(TAG, "Error closing serial port: " + e.getMessage());
            }
            serialPort = null;
        }

        if (connection != null) {
            try {
                connection.close();
            } catch (Exception e) {
                Log.w(TAG, "Error closing USB connection: " + e.getMessage());
            }
            connection = null;
        }

        Log.i(TAG, "Serial port closed");
    }

    /**
     * Write data to the serial port.
     */
    public void write(byte[] data) {
        if (serialPort != null && portOpen.get() && data != null) {
            serialPort.write(data);
        } else {
            Log.w(TAG, "Write skipped: port not ready");
        }
    }

    /**
     * Set the serial read callback.
     */
    public void setReadCallback(UsbSerialInterface.UsbReadCallback callback) {
        if (serialPort != null && portOpen.get()) {
            serialPort.read(callback);
        } else {
            Log.w(TAG, "Cannot set read callback: port not open");
        }
    }

    /**
     * Get the raw serial port for protocol layer access.
     */
    public UsbSerialDevice getSerialPort() {
        return serialPort;
    }

    public boolean isPortOpen() {
        return portOpen.get();
    }

    public String getCurrentProtocol() {
        return currentProtocol;
    }

    public CableInfo getCurrentCable() {
        return currentCable;
    }

    /**
     * Get the default baud rate for a cable type.
     */
    private int getDefaultBaudRate(String cableType) {
        switch (cableType) {
            case "k_dcan_ftdi":
            case "k_dcan_ch340":
                // Start at K-Line baud; protocol layer will switch to D-CAN if needed
                return KLINE_BAUD;
            case "enet":
                return ENET_BAUD;
            default:
                return DEFAULT_BAUD;
        }
    }

    private String getChipName(int vendorId, int productId) {
        if (vendorId == 0x0403) {
            switch (productId) {
                case 0x6001: return "FTDI_FT232R";
                case 0x6010: return "FTDI_FT2232H";
                case 0x6011: return "FTDI_FT4232H";
                case 0x6014: return "FTDI_FT232H";
                default: return "FTDI_Unknown";
            }
        }
        if (vendorId == 0x1A86 || vendorId == 0x4348) {
            if (productId == 0x5523) return "CH341";
            return "CH340";
        }
        if (vendorId == 0x10C4) {
            return productId == 0xEA70 ? "CP2105" : "CP2102";
        }
        return "unknown";
    }

    /**
     * Clean up all resources. Must be called when done.
     */
    public void cleanup() {
        closePort();
        try {
            context.unregisterReceiver(permissionReceiver);
        } catch (Exception e) {
            // Receiver may not be registered
        }
    }

    /**
     * Cable information data class.
     */
    public static class CableInfo {
        public final String type;
        public final String vendorId;
        public final String productId;
        public final String serialNumber;
        public final String driverVersion;
        public final int baudRate;
        public final boolean isGenuine;
        public final String detectedChip;

        public CableInfo(String type, String vendorId, String productId, String serialNumber,
                        String driverVersion, int baudRate, boolean isGenuine, String detectedChip) {
            this.type = type;
            this.vendorId = vendorId;
            this.productId = productId;
            this.serialNumber = serialNumber;
            this.driverVersion = driverVersion;
            this.baudRate = baudRate;
            this.isGenuine = isGenuine;
            this.detectedChip = detectedChip;
        }
    }
}
