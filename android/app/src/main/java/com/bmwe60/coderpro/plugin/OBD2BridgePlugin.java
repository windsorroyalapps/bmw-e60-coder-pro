package com.bmwe60.coderpro.plugin;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * BMW E60 Coder Pro - OBD2 Native Bridge Plugin
 * Provides live USB OBD2 communication for K+DCAN cables.
 * All methods return real data from the vehicle ECU - no simulation.
 */
@CapacitorPlugin(name = "OBD2Bridge")
public class OBD2BridgePlugin extends Plugin {

    private UsbSerialManager usbManager;
    private KDCANProtocol kdcanProtocol;
    private CANBusManager canBusManager;
    private DMEFlashService dmeFlashService;

    @Override
    public void load() {
        super.load();
        usbManager = new UsbSerialManager(getContext());
        kdcanProtocol = new KDCANProtocol();
        canBusManager = new CANBusManager();
        dmeFlashService = new DMEFlashService();
    }

    /**
     * Scan for connected K+DCAN USB cables.
     * Returns actual detected cable info or empty if none found.
     */
    @PluginMethod
    public void detectCable(PluginCall call) {
        JSObject result = new JSObject();
        try {
            UsbSerialManager.CableInfo cable = usbManager.scanForCable();
            if (cable != null) {
                JSObject cableObj = new JSObject();
                cableObj.put("type", cable.type);
                cableObj.put("vendorId", cable.vendorId);
                cableObj.put("productId", cable.productId);
                cableObj.put("serialNumber", cable.serialNumber != null ? cable.serialNumber : "");
                cableObj.put("driverVersion", cable.driverVersion);
                cableObj.put("baudRate", cable.baudRate);
                cableObj.put("isGenuine", cable.isGenuine);
                cableObj.put("detectedChip", cable.detectedChip);
                result.put("cable", cableObj);
                result.put("found", true);
            } else {
                result.put("found", false);
                result.put("error", "No K+DCAN cable detected. Check USB OTG connection.");
            }
            call.resolve(result);
        } catch (Exception e) {
            call.reject("DETECT_ERROR", "Failed to detect cable: " + e.getMessage(), e);
        }
    }

    /**
     * Connect to vehicle via detected cable.
     * Performs real OBD2 handshaking and ECU scanning.
     */
    @PluginMethod
    public void connect(PluginCall call) {
        JSObject result = new JSObject();
        try {
            // Open USB serial port
            boolean opened = usbManager.openPort();
            if (!opened) {
                result.put("success", false);
                result.put("error", "Failed to open USB serial port");
                call.resolve(result);
                return;
            }

            // Initialize K+DCAN protocol
            kdcanProtocol.init(usbManager.getSerialPort());

            // Perform OBD2 handshake
            boolean handshake = kdcanProtocol.performHandshake();
            if (!handshake) {
                usbManager.closePort();
                result.put("success", false);
                result.put("error", "OBD2 handshake failed - no response from vehicle");
                call.resolve(result);
                return;
            }

            // Scan for ECUs
            List<KDCANProtocol.ECUInfo> ecus = kdcanProtocol.scanECUs();

            // Build ECU response array
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

            // Read battery voltage
            double batteryVoltage = kdcanProtocol.readBatteryVoltage();

            // Determine protocol
            String protocol = usbManager.getCurrentProtocol();

            // Build diagnostics
            JSObject diagnostics = new JSObject();
            diagnostics.put("cableDetectTime", kdcanProtocol.getCableDetectTime());
            diagnostics.put("protocolNegotiateTime", kdcanProtocol.getProtocolNegotiateTime());
            diagnostics.put("ecuScanTime", kdcanProtocol.getEcuScanTime());
            diagnostics.put("totalConnectTime", kdcanProtocol.getTotalConnectTime());
            diagnostics.put("retries", kdcanProtocol.getRetryCount());

            JSArray errors = new JSArray();
            for (String err : kdcanProtocol.getErrors()) {
                errors.put(err);
            }
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
            usbManager.closePort();
            call.reject("CONNECT_ERROR", "Connection failed: " + e.getMessage(), e);
        }
    }

    /**
     * Disconnect from vehicle and close USB port.
     */
    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            kdcanProtocol.close();
            usbManager.closePort();
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("DISCONNECT_ERROR", "Disconnect failed: " + e.getMessage(), e);
        }
    }

    /**
     * Read live OBD2 data from all PIDs.
     * Returns real sensor values from the vehicle.
     */
    @PluginMethod
    public void readLiveData(PluginCall call) {
        JSObject result = new JSObject();
        try {
            if (!kdcanProtocol.isConnected()) {
                result.put("connected", false);
                call.resolve(result);
                return;
            }

            Map<String, Double> liveData = kdcanProtocol.readAllLiveData();

            for (Map.Entry<String, Double> entry : liveData.entrySet()) {
                result.put(entry.getKey(), entry.getValue());
            }
            result.put("connected", true);
            result.put("timestamp", System.currentTimeMillis());

            call.resolve(result);
        } catch (Exception e) {
            call.reject("READ_ERROR", "Failed to read live data: " + e.getMessage(), e);
        }
    }

    /**
     * Read a single PID value.
     */
    @PluginMethod
    public void readPID(PluginCall call) {
        String pid = call.getString("pid", "");
        if (pid.isEmpty()) {
            call.reject("INVALID_PID", "PID parameter is required");
            return;
        }

        try {
            double value = kdcanProtocol.readPID(pid);
            JSObject result = new JSObject();
            result.put("pid", pid);
            result.put("value", value);
            result.put("timestamp", System.currentTimeMillis());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("PID_ERROR", "Failed to read PID " + pid + ": " + e.getMessage(), e);
        }
    }

    /**
     * Read DME information (ECU type, software version, VIN).
     */
    @PluginMethod
    public void readDMEInfo(PluginCall call) {
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
            call.reject("DME_READ_ERROR", "Failed to read DME info: " + e.getMessage(), e);
        }
    }

    /**
     * Start a flash session.
     */
    @PluginMethod
    public void startFlash(PluginCall call) {
        boolean isLiveFlash = call.getBoolean("isLiveFlash", false);
        try {
            JSONObject jsonResult = dmeFlashService.startFlash(kdcanProtocol, isLiveFlash);
            JSObject result = convertJsonObjectToJSObject(jsonResult);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("FLASH_START_ERROR", "Failed to start flash: " + e.getMessage(), e);
        }
    }

    /**
     * Execute the flash sequence.
     * Reports real progress via event emitter.
     */
    @PluginMethod
    public void executeFlash(PluginCall call) {
        try {
            dmeFlashService.executeFlash(kdcanProtocol, new DMEFlashService.FlashProgressCallback() {
                @Override
                public void onProgress(int progress, String currentSector, int sectorsComplete, int sectorsTotal, double speed, int eta) {
                    JSObject progressData = new JSObject();
                    progressData.put("progress", progress);
                    progressData.put("currentSector", currentSector);
                    progressData.put("sectorsComplete", sectorsComplete);
                    progressData.put("sectorsTotal", sectorsTotal);
                    progressData.put("speed", speed);
                    progressData.put("eta", eta);
                    notifyListeners("flashProgress", progressData);
                }

                @Override
                public void onComplete() {
                    JSObject completeData = new JSObject();
                    completeData.put("status", "complete");
                    notifyListeners("flashComplete", completeData);
                }

                @Override
                public void onError(String error) {
                    JSObject errorData = new JSObject();
                    errorData.put("status", "error");
                    errorData.put("error", error);
                    notifyListeners("flashError", errorData);
                }
            });

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("FLASH_ERROR", "Flash execution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Quick flash - write only calibration data.
     */
    @PluginMethod
    public void quickFlash(PluginCall call) {
        try {
            JSONObject jsonResult = dmeFlashService.quickFlash(kdcanProtocol);
            JSObject result = convertJsonObjectToJSObject(jsonResult);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("QUICK_FLASH_ERROR", "Quick flash failed: " + e.getMessage(), e);
        }
    }

    /**
     * Abort current flash.
     */
    @PluginMethod
    public void abortFlash(PluginCall call) {
        try {
            dmeFlashService.abortFlash();
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("ABORT_ERROR", "Failed to abort flash: " + e.getMessage(), e);
        }
    }

    /**
     * Send CAN bus commands (for gamepad control).
     */
    @PluginMethod
    public void sendCANCommands(PluginCall call) {
        JSArray commands = call.getArray("commands", new JSArray());
        if (commands == null || commands.length() == 0) {
            call.reject("INVALID_COMMANDS", "Commands array is required");
            return;
        }

        try {
            for (int i = 0; i < commands.length(); i++) {
                JSONObject cmd = commands.getJSONObject(i);
                String arbitrationId = cmd.getString("arbitrationId");
                String data = cmd.getString("data");
                canBusManager.sendCommand(kdcanProtocol, arbitrationId, data);
            }
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("sent", commands.length());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("CAN_ERROR", "Failed to send CAN commands: " + e.getMessage(), e);
        }
    }

    /**
     * Write a single DME parameter (for AI tuning adjustments).
     */
    @PluginMethod
    public void writeDMEParameter(PluginCall call) {
        String parameter = call.getString("parameter", "");
        double value = call.getDouble("value", 0.0);
        if (parameter.isEmpty()) {
            call.reject("INVALID_PARAM", "Parameter name is required");
            return;
        }

        try {
            boolean success = kdcanProtocol.writeDMEParameter(parameter, value);
            JSObject result = new JSObject();
            result.put("success", success);
            result.put("parameter", parameter);
            result.put("value", value);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("WRITE_ERROR", "Failed to write parameter: " + e.getMessage(), e);
        }
    }

    /**
     * Get current connection state.
     */
    @PluginMethod
    public void getConnectionState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", kdcanProtocol.isConnected());
        result.put("usbOpen", usbManager.isPortOpen());
        call.resolve(result);
    }

    /**
     * Helper method to convert JSONObject to JSObject.
     */
    private JSObject convertJsonObjectToJSObject(JSONObject json) throws JSONException {
        JSObject result = new JSObject();
        if (json != null) {
            java.util.Iterator<String> keys = json.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                result.put(key, json.get(key));
            }
        }
        return result;
    }
}
