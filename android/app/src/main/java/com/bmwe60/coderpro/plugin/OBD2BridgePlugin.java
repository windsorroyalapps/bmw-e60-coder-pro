package com.bmwe60.coderpro.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;

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
    private CANBusManager canBusManager;
    private DMEFlashService dmeFlashService;
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
        canBusManager = new CANBusManager();
        dmeFlashService = new DMEFlashService();
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
            UsbDevice targetDevice = null;
            for (UsbSerialDriver driver : usbManager.getCustomProber().findAllDrivers(usbManager)) {
                if (driver.getDevice().getVendorId() == targetCable.vendorId
                    && driver.getDevice().getProductId() == targetCable.productId) {
                    targetDevice = driver.getDevice();
                    break;
                }
            }

            if (targetDevice == null) {
                result.put("success", false);
                result.put("error", "Adapter found but driver mismatch.");
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
                                r.put("error", "USB permission denied by user.");
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
                result.put("error", "Failed to open USB serial port.");
                call.resolve(result);
                return;
            }

            if ("KDCAN".equalsIgnoreCase(adapterType) || targetCable.type.contains("K+DCAN")) {
                usbManager.setBMWKLineMode();
            } else if ("ELM327".equalsIgnoreCase(adapterType) || targetCable.detectedChip.contains("Ftdi") || targetCable.detectedChip.contains("CH340")) {
                usbManager.setELM327Mode();
            }

            kdcanProtocol.init(usbManager.getSerialPort());
            com.bmwe60.coderpro.car.obd.KDCANManager.getInstance().setSerialPort(usbManager.getSerialPort());

            boolean handshake = kdcanProtocol.performHandshake();
            if (!handshake) {
                usbManager.closePort();
                List<String> errors = kdcanProtocol.getErrors();
                String errorMsg = errors.isEmpty() ? "OBD2 handshake failed - no response from vehicle" : errors.get(errors.size() - 1);
                result.put("success", false);
                result.put("error", errorMsg);
                result.put("details", new JSONArray(errors));
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

    @PluginMethod
    public void provisionFuelCard(PluginCall call) {
        String token = call.getString("token");
        if (token == null || token.isEmpty()) {
            token = com.bmwe60.coderpro.nfc.EMVProcessor.generateRollingPan("4242", 16);
        }
        if (!com.bmwe60.coderpro.nfc.EMVProcessor.validateLuhn(token)) {
            call.reject("Invalid card number (Luhn check failed)");
            return;
        }
        try {
            com.bmwe60.coderpro.nfc.vault.SecureTokenVault.storeToken(getContext(), token);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("token", token);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
