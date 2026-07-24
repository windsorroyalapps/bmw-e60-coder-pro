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
import java.util.ArrayList;
import java.util.List;

public class UsbSerialManager {
    private static final String TAG = "UsbSerialManager";
    public static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";

    private final Context context;
    private final UsbManager usbManager;
    private UsbSerialPort serialPort;
    private UsbDeviceConnection connection;
    private String currentProtocol = "NONE";

    public interface PermissionCallback {
        void onPermissionGranted(UsbDevice device);
        void onPermissionDenied(UsbDevice device);
    }

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
        public boolean hasPermission;

        public CableInfo(UsbDevice device, String driverName, boolean hasPermission) {
            this.type = inferAdapterType(device.getVendorId(), device.getProductId(), driverName);
            this.vendorId = device.getVendorId();
            this.productId = device.getProductId();
            this.serialNumber = device.getSerialNumber();
            this.detectedChip = driverName;
            this.hasPermission = hasPermission;
        }
    }

    private static String inferAdapterType(int vid, int pid, String driverName) {
        if (vid == 0x0403) return "FTDI OBD2 Adapter";
        if (vid == 0x1A86 && pid == 0x7523) return "CH340 OBD2 Adapter";
        if (vid == 0x10C4) return "CP2102 OBD2 Adapter";
        if (vid == 0x067B) return "PL2303 OBD2 Adapter";
        if (driverName.contains("Ftdi")) return "FTDI Cable";
        if (driverName.contains("Prolific")) return "PL2303 Cable";
        if (driverName.contains("Ch34")) return "CH340 Cable";
        if (driverName.contains("Cp21")) return "CP2102 Cable";
        return "K+DCAN / OBD2 Adapter";
    }

    public UsbManager getUsbManager() {
        return usbManager;
    }

    public List<CableInfo> scanForAdapters() {
        List<CableInfo> results = new ArrayList<>();
        UsbSerialProber prober = UsbSerialProber.getDefaultProber();
        List<UsbSerialDriver> availableDrivers = prober.findAllDrivers(usbManager);
        for (UsbSerialDriver driver : availableDrivers) {
            UsbDevice device = driver.getDevice();
            boolean hasPerm = usbManager.hasPermission(device);
            results.add(new CableInfo(device, driver.getClass().getSimpleName(), hasPerm));
        }
        return results;
    }

    public CableInfo scanForCable() {
        List<CableInfo> adapters = scanForAdapters();
        return adapters.isEmpty() ? null : adapters.get(0);
    }

    public boolean hasPermission(UsbDevice device) {
        return usbManager.hasPermission(device);
    }

    public void requestPermission(UsbDevice device, PermissionCallback callback) {
        if (usbManager.hasPermission(device)) {
            callback.onPermissionGranted(device);
            return;
        }
        OBD2BridgePlugin.setPendingPermissionCallback(device, callback);
        int flags = PendingIntent.FLAG_IMMUTABLE;
        PendingIntent usbPermissionIntent = PendingIntent.getBroadcast(context, 0, new Intent(ACTION_USB_PERMISSION), flags);
        usbManager.requestPermission(device, usbPermissionIntent);
    }

    public boolean openPort(UsbDevice device) {
        UsbSerialProber prober = UsbSerialProber.getDefaultProber();
        List<UsbSerialDriver> availableDrivers = prober.findAllDrivers(usbManager);
        UsbSerialDriver targetDriver = null;
        for (UsbSerialDriver driver : availableDrivers) {
            if (driver.getDevice().getDeviceId() == device.getDeviceId()) {
                targetDriver = driver;
                break;
            }
        }
        if (targetDriver == null) return false;
        if (!usbManager.hasPermission(device)) return false;

        connection = usbManager.openDevice(device);
        if (connection == null) return false;

        serialPort = targetDriver.getPorts().get(0);
        try {
            serialPort.open(connection);
            serialPort.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            currentProtocol = "OBD2 (115200)";
            return true;
        } catch (IOException e) {
            Log.e(TAG, "Error opening port: " + e.getMessage());
            try { serialPort.close(); } catch (Exception ignored) {}
            serialPort = null;
            return false;
        }
    }

    public boolean openPort() {
        List<CableInfo> adapters = scanForAdapters();
        if (adapters.isEmpty()) return false;
        CableInfo first = adapters.get(0);
        UsbSerialProber prober = UsbSerialProber.getDefaultProber();
        for (UsbSerialDriver driver : prober.findAllDrivers(usbManager)) {
            if (driver.getDevice().getVendorId() == first.vendorId && driver.getDevice().getProductId() == first.productId) {
                return openPort(driver.getDevice());
            }
        }
        return false;
    }

    public void setBMWKLineMode() {
        if (serialPort == null) return;
        try {
            serialPort.setParameters(10400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            serialPort.setDTR(true);
            serialPort.setRTS(false);
            currentProtocol = "K-LINE (10400)";
        } catch (IOException e) {
            Log.e(TAG, "K-Line mode error: " + e.getMessage());
        }
    }

    public void setBMWDCANMode() {
        if (serialPort == null) return;
        try {
            serialPort.setParameters(500000, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            serialPort.setDTR(false);
            serialPort.setRTS(true);
            currentProtocol = "D-CAN (500k)";
        } catch (IOException e) {
            Log.e(TAG, "D-CAN mode error: " + e.getMessage());
        }
    }

    public void setELM327Mode() {
        if (serialPort == null) return;
        try {
            serialPort.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            serialPort.setDTR(false);
            serialPort.setRTS(false);
            currentProtocol = "ELM327 (115200)";
        } catch (IOException e) {
            Log.e(TAG, "ELM327 mode error: " + e.getMessage());
        }
    }

    public UsbSerialPort getSerialPort() { return serialPort; }
    public boolean isPortOpen() { return serialPort != null && serialPort.isOpen(); }
    public String getCurrentProtocol() { return currentProtocol; }

    public void closePort() {
        try { if (serialPort != null) serialPort.close(); } catch (IOException ignored) {}
        serialPort = null;
        try { if (connection != null) connection.close(); } catch (Exception ignored) {}
        connection = null;
        currentProtocol = "NONE";
    }

    public void cleanup() { closePort(); }
}
