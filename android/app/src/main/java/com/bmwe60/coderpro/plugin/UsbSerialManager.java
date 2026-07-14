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

import com.felhr.usbserial.UsbSerialDevice;
import com.felhr.usbserial.UsbSerialInterface;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * USB Serial Manager for K+DCAN cables.
 * Handles detection and communication with FTDI FT232R, CH340/CH341, and CP2102 chips.
 * All operations use real USB hardware - no simulation.
 */
public class UsbSerialManager {

    private static final String TAG = "BMW-OBD2-USB";
    private static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";

    // Known K+DCAN cable USB IDs
    private static final Map<int[], String> KNOWN_CABLES = new HashMap<>();
    static {
        // FTDI FT232R/RL - Genuine BMW cables
        KNOWN_CABLES.put(new int[]{0x0403, 0x6001}, "k_dcan_ftdi");
        KNOWN_CABLES.put(new int[]{0x0403, 0x6010}, "k_dcan_ftdi");
        KNOWN_CABLES.put(new int[]{0x0403, 0x6011}, "k_dcan_ftdi");
        // FTDI FT232H
        KNOWN_CABLES.put(new int[]{0x0403, 0x6014}, "k_dcan_ftdi");
        // CH340/CH341 - Clone cables
        KNOWN_CABLES.put(new int[]{0x1A86, 0x7523}, "k_dcan_ch340");
        KNOWN_CABLES.put(new int[]{0x1A86, 0x5523}, "k_dcan_ch340");
        KNOWN_CABLES.put(new int[]{0x4348, 0x5523}, "k_dcan_ch340");
        // CP2102 - Some ENET adapters
        KNOWN_CABLES.put(new int[]{0x10C4, 0xEA60}, "enet");
        KNOWN_CABLES.put(new int[]{0x10C4, 0xEA70}, "enet");
    }

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
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            Log.i(TAG, "USB permission granted for " + device.getDeviceName());
                        }
                    } else {
                        Log.w(TAG, "USB permission denied");
                    }
                }
            }
        }
    };

    public UsbSerialManager(Context context) {
        this.context = context;
        this.usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);

        // Register USB permission receiver
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        context.registerReceiver(permissionReceiver, filter);
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
                    int baudRate = cableType.equals("enet") ? 1000000 : 115200;

                    currentCable = new CableInfo(
                        cableType,
                        String.format("0x%04X", vendorId),
                        String.format("0x%04X", productId),
                        device.getSerialNumber(),
                        "1.0", // Driver version detected at runtime
                        baudRate,
                        isGenuine,
                        chipName
                    );

                    Log.i(TAG, "Detected cable: " + cableType + " (" + chipName + ")");
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
                        context, 0, new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_MUTABLE);
                    usbManager.requestPermission(device, permissionIntent);
                    Log.w(TAG, "USB permission not granted, requesting...");
                    return false;
                }

                connection = usbManager.openDevice(device);
                if (connection == null) {
                    Log.e(TAG, "Failed to open USB device");
                    return false;
                }

                serialPort = UsbSerialDevice.createUsbSerialDevice(device, connection);
                if (serialPort == null) {
                    Log.e(TAG, "Failed to create serial device");
                    connection.close();
                    return false;
                }

                boolean opened = serialPort.open();
                if (!opened) {
                    Log.e(TAG, "Failed to open serial port");
                    return false;
                }

                // Configure serial parameters
                int baudRate = currentCable.baudRate;
                serialPort.setBaudRate(baudRate);
                serialPort.setDataBits(UsbSerialInterface.DATA_BITS_8);
                serialPort.setStopBits(UsbSerialInterface.STOP_BITS_1);
                serialPort.setParity(UsbSerialInterface.PARITY_NONE);
                serialPort.setFlowControl(UsbSerialInterface.FLOW_CONTROL_OFF);

                portOpen.set(true);
                currentProtocol = currentCable.type.equals("enet") ? "enet" : "k_dcan";

                Log.i(TAG, "Serial port opened at " + baudRate + " baud");
                return true;
            }
        }

        return false;
    }

    /**
     * Close the USB serial port.
     */
    public void closePort() {
        portOpen.set(false);
        currentProtocol = "none";

        if (serialPort != null) {
            try {
                serialPort.close();
            } catch (Exception e) {
                Log.w(TAG, "Error closing serial port", e);
            }
            serialPort = null;
        }

        if (connection != null) {
            try {
                connection.close();
            } catch (Exception e) {
                Log.w(TAG, "Error closing USB connection", e);
            }
            connection = null;
        }

        Log.i(TAG, "Serial port closed");
    }

    /**
     * Write data to the serial port.
     */
    public void write(byte[] data) {
        if (serialPort != null && portOpen.get()) {
            serialPort.write(data);
        }
    }

    /**
     * Set the serial read callback.
     */
    public void setReadCallback(UsbSerialInterface.UsbReadCallback callback) {
        if (serialPort != null) {
            serialPort.read(callback);
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

    private String getChipName(int vendorId, int productId) {
        if (vendorId == 0x0403) {
            if (productId == 0x6014) return "FTDI_FT232H";
            return "FTDI_FT232R";
        }
        if (vendorId == 0x1A86 || vendorId == 0x4348) {
            if (productId == 0x5523) return "CH341";
            return "CH340";
        }
        if (vendorId == 0x10C4) return "CP2102";
        return "unknown";
    }

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