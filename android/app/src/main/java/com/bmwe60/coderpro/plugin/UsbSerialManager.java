package com.bmwe60.coderpro.plugin;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Log;

import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;

import java.io.IOException;
import java.util.List;

public class UsbSerialManager {
    private static final String TAG = "UsbSerialManager";
    private static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";

    private final Context context;
    private final UsbManager usbManager;
    private UsbSerialPort serialPort;
    private UsbDeviceConnection connection;
    private String currentProtocol = "NONE";

    public UsbSerialManager(Context context) {
        this.context = context;
        this.usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
    }

    public static class CableInfo {
        public String type;
        public int vendorId;
        public int productId;
        public String serialNumber;
        public String driverVersion = "3.8.0";
        public int baudRate = 0;
        public boolean isGenuine = true;
        public String detectedChip;

        public CableInfo(UsbDevice device, String driverName) {
            this.type = "BMW K+DCAN Cable";
            this.vendorId = device.getVendorId();
            this.productId = device.getProductId();
            this.serialNumber = device.getSerialNumber();
            this.detectedChip = driverName;
        }
    }

    public CableInfo scanForCable() {
        List<UsbSerialDriver> availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
        if (availableDrivers.isEmpty()) {
            return null;
        }

        UsbSerialDriver driver = availableDrivers.get(0);
        UsbDevice device = driver.getDevice();
        return new CableInfo(device, driver.getClass().getSimpleName());
    }

    public boolean openPort() {
        List<UsbSerialDriver> availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
        if (availableDrivers.isEmpty()) return false;

        UsbSerialDriver driver = availableDrivers.get(0);
        UsbDevice device = driver.getDevice();

        if (!usbManager.hasPermission(device)) {
            int flags = PendingIntent.FLAG_IMMUTABLE;
            PendingIntent usbPermissionIntent = PendingIntent.getBroadcast(context, 0, new Intent(ACTION_USB_PERMISSION), flags);
            usbManager.requestPermission(device, usbPermissionIntent);
            return false;
        }

        connection = usbManager.openDevice(device);
        if (connection == null) return false;

        serialPort = driver.getPorts().get(0);
        try {
            serialPort.open(connection);
            // Default BMW K-Line settings
            serialPort.setParameters(10400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            
            // K+DCAN Specific: DTR high, RTS low for K-Line
            serialPort.setDTR(true);
            serialPort.setRTS(false);
            
            currentProtocol = "K-LINE (10400)";
            return true;
        } catch (IOException e) {
            Log.e(TAG, "Error opening port: " + e.getMessage());
            try { serialPort.close(); } catch (Exception ignored) {}
            serialPort = null;
            return false;
        }
    }

    public void setProtocolMode(String mode) {
        if (serialPort == null) return;
        try {
            if ("DCAN".equalsIgnoreCase(mode)) {
                serialPort.setParameters(500000, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
                serialPort.setDTR(false);
                serialPort.setRTS(true);
                currentProtocol = "D-CAN (500k)";
            } else {
                serialPort.setParameters(10400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
                serialPort.setDTR(true);
                serialPort.setRTS(false);
                currentProtocol = "K-LINE (10.4k)";
            }
        } catch (IOException e) {
            Log.e(TAG, "Error setting protocol mode: " + e.getMessage());
        }
    }

    public UsbSerialPort getSerialPort() {
        return serialPort;
    }

    public boolean isPortOpen() {
        return serialPort != null && serialPort.isOpen();
    }

    public String getCurrentProtocol() {
        return currentProtocol;
    }

    public void closePort() {
        try {
            if (serialPort != null) serialPort.close();
        } catch (IOException ignored) {}
        serialPort = null;
        if (connection != null) connection.close();
        connection = null;
        currentProtocol = "NONE";
    }

    public void cleanup() {
        closePort();
    }
}
