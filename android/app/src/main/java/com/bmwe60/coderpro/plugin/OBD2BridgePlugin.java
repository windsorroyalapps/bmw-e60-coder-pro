package com.bmwe60.coderpro.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "OBD2Bridge")
public class OBD2BridgePlugin extends Plugin {

    private static final String TAG = "OBD2Bridge";
    private static final Map<String, UsbSerialManager.PermissionCallback> pendingCallbacks = new HashMap<>();

    private UsbSerialManager usbManager;
    private KDCANProtocol kdcanProtocol;
    private volatile boolean isDestroyed = false;
    private BroadcastReceiver usbPermissionReceiver;
    private BroadcastReceiver usbAttachReceiver;

    public static void setPendingPermissionCallback(UsbDevice device, UsbSerialManager.PermissionCallback cb) {
        pendingCallbacks.put(device.getDeviceName(), cb);
    }

    @Override
    public void load() {
        super.load();
        usbManager = new UsbSerialManager(getContext());
        kdcanProtocol = new KDCANProtocol();
        isDestroyed = false;
        registerReceivers();
    }

    private void registerReceivers() {
        usbPermissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (UsbSerialManager.ACTION_USB_PERMISSION.equals(action)) {
                    synchronized (this) {
                        UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                        boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                        if (device != null) {
                            UsbSerialManager.PermissionCallback cb = pendingCallbacks.remove(device.getDeviceName());
                            if (cb != null) {
                                if (granted) cb.onPermissionGranted(device);
                                else cb.onPermissionDenied(device);
                            }
                        }
                    }
                }
            }
        };

        IntentFilter permFilter = new IntentFilter(UsbSerialManager.ACTION_USB_PERMISSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(usbPermissionReceiver, permFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(usbPermissionReceiver, permFilter);
        }

        usbAttachReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                JSObject ret = new JSObject();
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    ret.put("event", "attached");
                    ret.put("deviceName", device != null ? device.getDeviceName() : "");
                    notifyListeners("usbDeviceEvent", ret);
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    ret.put("event", "detached");
                    ret.put("deviceName", device != null ? device.getDeviceName() : "");
                    notifyListeners("usbDeviceEvent", ret);
                    if (usbManager.isPortOpen()) {
                        disconnectInternal();
                    }
                }
            }
        };

        IntentFilter attachFilter = new IntentFilter();
        attachFilter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        attachFilter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(usbAttachReceiver, attachFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(usbAttachReceiver, attachFilter);
        }
    }

    @Override
    public void handleOnDestroy() {
        isDestroyed = true;
        disconnectInternal();
        try {
            if (usbPermissionReceiver != null) getContext().unregisterReceiver(usbPermissionReceiver);
        } catch (Exception e) {}
        try {
            if (usbAttachReceiver != null) getContext().unregisterReceiver(usbAttachReceiver);
        } catch (Exception e) {}
        super.handleOnDestroy();
    }

    private boolean checkDestroyed(PluginCall call) {
        if (isDestroyed) {
            call.reject("PLUGIN_DESTROYED", "Plugin has been destroyed");
            return true;
        }
        return false;
    }

    private void disconnectInternal() {
        try { kdcanProtocol.close(); } catch (Exception e) {}
        try { usbManager.cleanup(); } catch (Exception e) {}
    }

    @PluginMethod
    public void detectCable(PluginCall call) {
        if (checkDestroyed(call)) return;
        JSObject result = new JSObject();
        try {
            List<UsbSerialManager.CableInfo> cables = usbManager.scanForAdapters();
            JSArray cableArray = new JSArray();
            for (UsbSerialManager.CableInfo cable : cables) {
                JSObject cableObj = new JSObject();
                cableObj.put("type", cable.type);
                cableObj.put("vendorId", cable.vendorId);
                cableObj.put("productId", cable.productId);
                cableObj.put("serialNumber", cable.serialNumber != null ? cable.serialNumber : "");
                cableObj.put("driverVersion", cable.driverVersion);
                cableObj.put("baudRate", cable.baudRate);
                cableObj.put("isGenuine", cable.isGenuine);
                cableObj.put("detectedChip", cable.detectedChip);
                cableObj.put("hasPermission", cable.hasPermission);
                cableObj.put("isGeneric", cable.isGeneric);
                cableArray.put(cableObj);
            }
            result.put("cables", cableArray);
            result.put("found", cables.size() > 0);
            result.put("count", cables.size());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("DETECT_ERROR", "Failed to detect adapters: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (checkDestroyed(call)) return;
        String adapterType = call.getString("adapterType", "AUTO");
        connectInternal(call, adapterType);
    }

    private void connectInternal(PluginCall call, String adapterType) {
        JSObject result = new JSObject();
        try {
            List<UsbSerialManager.CableInfo> cables = usbManager.scanForAdapters();
            if (cables.isEmpty()) {
                result.put("success", false);
                result.put("error", "No OBD2 adapter detected. Check USB OTG connection.");
                call.resolve(result);
                return;
            }

            UsbSerialManager.CableInfo targetCable = cables.get(0);
            Log.i(TAG, "Detected adapter: " + targetCable.type + " (" + targetCable.detectedChip + ")");

            UsbDevice targetDevice = null;
            for (com.hoho.android.usbserial.driver.UsbSerialDriver driver : com.hoho.android.usbserial.driver.UsbSerialProber.getDefaultProber().findAllDrivers(usbManager.getUsbManager())) {
                if (driver.getDevice().getVendorId() == targetCable.vendorId
                    && driver.getDevice().getProductId() == targetCable.productId) {
                    targetDevice = driver.getDevice();
                    break;
                }
            }

            if (targetDevice == null) {
                result.put("success", false);
                result.put("error", "Adapter found but driver mismatch. Try Generic USB Serial preset.");
                call.resolve(result);
                return;
            }

            if (!usbManager.hasPermission(targetDevice)) {
                usbManager.requestPermission(targetDevice, new UsbSerialManager.PermissionCallback() {
                    @Override
                    public void onPermissionGranted(UsbDevice device) {
                        bridge.executeOnMainThread(() -> {
                            PluginCall savedCall = bridge.getSavedCall(call.getCallbackId());
                            if (savedCall != null) {
                                connectInternal(savedCall, adapterType);
                            }
                        });
                    }
                    @Override
                    public void onPermissionDenied(UsbDevice device) {
                        bridge.executeOnMainThread(() -> {
                            PluginCall savedCall = bridge.getSavedCall(call.getCallbackId());
                            if (savedCall != null) {
                                JSObject r = new JSObject();
                                r.put("success", false);
                                r.put("error", "USB permission denied by user. Grant permission in system dialog.");
                                savedCall.resolve(r);
                            }
                        });
                    }
                });
                call.save();
                return;
            }

            boolean opened = usbManager.openPort(targetDevice);
            if (!opened) {
                result.put("success", false);
                result.put("error", "Failed to open USB serial port. Try unplugging and reconnecting the adapter.");
                call.resolve(result);
                return;
            }

            // Wait for port to stabilize
            Thread.sleep(200);

            // Determine connection strategy based on adapter type
            boolean isELM327 = "ELM327".equalsIgnoreCase(adapterType);
            boolean isGeneric = targetCable.isGeneric || targetCable.type.contains("Generic");
            boolean isKDCAN = targetCable.type.contains("K+DCAN") || targetCable.type.contains("BMW");

            boolean handshake = false;
            String triedProtocols = "";

            if (isELM327 || isGeneric) {
                // Generic/ELM327: Try ELM327 AT commands
                Log.i(TAG, "Trying ELM327 initialization...");
                usbManager.setELM327Mode();
                Thread.sleep(100);
                kdcanProtocol.init(usbManager.getSerialPort());
                handshake = kdcanProtocol.performELM327Init();
                triedProtocols = "ELM327";
            } else if (isKDCAN) {
                // BMW K+DCAN cable: Try K-Line first (more reliable on cheap cables), then D-CAN
                Log.i(TAG, "Trying K-Line first (BMW K+DCAN)...");
                usbManager.setBMWKLineMode();
                Thread.sleep(100);
                kdcanProtocol.init(usbManager.getSerialPort());
                handshake = kdcanProtocol.performKLineHandshake();
                triedProtocols = "K-Line";

                if (!handshake) {
                    Log.i(TAG, "K-Line failed, trying D-CAN...");
                    usbManager.setBMWDCANMode();
                    Thread.sleep(100);
                    kdcanProtocol.init(usbManager.getSerialPort());
                    handshake = kdcanProtocol.performDCANHandshake();
                    triedProtocols += ", D-CAN";
                }
            } else {
                // AUTO mode: Try all protocols
                Log.i(TAG, "AUTO mode: Trying D-CAN first...");
                usbManager.setBMWDCANMode();
                Thread.sleep(100);
                kdcanProtocol.init(usbManager.getSerialPort());
                handshake = kdcanProtocol.performDCANHandshake();
                triedProtocols = "D-CAN";

                if (!handshake) {
                    Log.i(TAG, "D-CAN failed, trying K-Line...");
                    usbManager.setBMWKLineMode();
                    Thread.sleep(100);
                    kdcanProtocol.init(usbManager.getSerialPort());
                    handshake = kdcanProtocol.performKLineHandshake();
                    triedProtocols += ", K-Line";
                }

                if (!handshake) {
                    Log.i(TAG, "K-Line failed, trying ELM327...");
                    usbManager.setELM327Mode();
                    Thread.sleep(100);
                    kdcanProtocol.init(usbManager.getSerialPort());
                    handshake = kdcanProtocol.performELM327Init();
                    triedProtocols += ", ELM327";
                }
            }

            if (!handshake) {
                usbManager.closePort();
                List<String> errors = kdcanProtocol.getErrors();
                String errorMsg = errors.isEmpty() 
                    ? "Vehicle not responding. Tried: " + triedProtocols 
                    : errors.get(errors.size() - 1);
                result.put("success", false);
                result.put("error", errorMsg);
                result.put("details", new JSONArray(errors));
                result.put("triedProtocols", triedProtocols);
                result.put("suggestion", "Check: (1) Vehicle ignition ON, (2) Cable fully seated, (3) Try Generic USB Serial preset for non-BMW cables");
                call.resolve(result);
                return;
            }

            List<KDCANProtocol.ECUInfo> ecus = kdcanProtocol.scanECUs();
            JSArray ecuArray = new JSArray();
            for (KDCANProtocol.ECUInfo ecu : ecus) {
                JSObject ecuObj = new JSObject();
                ecuObj.put("name", ecu.name);
                ecuObj.put("address", ecu.address);
                ecuObj.put("protocol", ecu.protocol);
                ecuObj.put("status", ecu.status);
                ecuObj.put("firmwareVersion", ecu.firmwareVersion != null ? ecu.firmwareVersion : "");
                ecuObj.put("lastResponse", ecu.lastResponse);
                ecuObj.put("faultCodes", ecu.faultCodes);
                ecuArray.put(ecuObj);
            }

            double batteryVoltage = kdcanProtocol.readBatteryVoltage();
            String protocol = usbManager.getCurrentProtocol();

            JSObject diagnostics = new JSObject();
            diagnostics.put("cableDetectTime", kdcanProtocol.getCableDetectTime());
            diagnostics.put("protocolNegotiateTime", kdcanProtocol.getProtocolNegotiateTime());
            diagnostics.put("ecuScanTime", kdcanProtocol.getEcuScanTime());
            diagnostics.put("totalConnectTime", kdcanProtocol.getTotalConnectTime());
            diagnostics.put("retries", kdcanProtocol.getRetryCount());

            JSArray errors = new JSArray();
            for (String err : kdcanProtocol.getErrors()) { errors.put(err); }
            diagnostics.put("errors", errors);

            result.put("success", true);
            result.put("protocol", protocol);
            result.put("ecus", ecuArray);
            result.put("batteryVoltage", batteryVoltage);
            result.put("ignitionState", batteryVoltage > 13.0 ? "on" : "off");
            result.put("engineRunning", batteryVoltage > 13.2);
            result.put("diagnostics", diagnostics);
            result.put("dmeProtocolVersion", kdcanProtocol.getDMEProtocolVersion());
            call.resolve(result);
        } catch (Exception e) {
            try { usbManager.closePort(); } catch (Exception ex) {}
            call.reject("CONNECT_ERROR", "Connection failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        if (checkDestroyed(call)) return;
        disconnectInternal();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void readLiveData(PluginCall call) {
        if (checkDestroyed(call)) return;
        JSObject result = new JSObject();
        try {
            if (!kdcanProtocol.isConnected()) {
                result.put("connected", false);
                call.resolve(result);
                return;
            }
            java.util.Map<String, Double> liveData = kdcanProtocol.readAllLiveData();
            for (java.util.Map.Entry<String, Double> entry : liveData.entrySet()) {
                result.put(entry.getKey(), entry.getValue());
            }
            result.put("connected", true);
            result.put("timestamp", System.currentTimeMillis());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("READ_ERROR", "Failed to read live data: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void readPID(PluginCall call) {
        if (checkDestroyed(call)) return;
        String pid = call.getString("pid", "");
        if (pid.isEmpty()) { call.reject("INVALID_PID", "PID required"); return; }
        try {
            double value = kdcanProtocol.readPID(pid);
            JSObject result = new JSObject();
            result.put("pid", pid); result.put("value", value);
            result.put("timestamp", System.currentTimeMillis());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("PID_ERROR", "Failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void readDMEInfo(PluginCall call) {
        if (checkDestroyed(call)) return;
        try {
            KDCANProtocol.DMEInfo info = kdcanProtocol.readDMEInfo();
            JSObject result = new JSObject();
            result.put("ecuType", info.ecuType);
            result.put("software", info.software);
            result.put("vin", info.vin);
            result.put("powerClass", info.powerClass);
            result.put("success", info.vin != null && !info.vin.isEmpty());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("DME_READ_ERROR", "Failed: " + e.getMessage(), e);
        }
    }
}
