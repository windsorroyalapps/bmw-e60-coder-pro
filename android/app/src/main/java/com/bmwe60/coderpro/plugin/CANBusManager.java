package com.bmwe60.coderpro.plugin;

import android.util.Log;

/**
 * CAN Bus Command Manager.
 * Handles sending CAN frames for gamepad vehicle control and real-time commands.
 * All commands are sent directly to the vehicle's CAN bus - no simulation.
 */
public class CANBusManager {

    private static final String TAG = "BMW-CAN";

    /**
     * Send a CAN command to the vehicle.
     */
    public void sendCommand(KDCANProtocol protocol, String arbitrationId, String data) {
        if (protocol == null || !protocol.isConnected()) {
            Log.w(TAG, "Cannot send CAN command - not connected");
            return;
        }

        try {
            // Parse hex data string to bytes
            String[] hexBytes = data.split("\\s+");
            byte[] dataBytes = new byte[hexBytes.length];
            for (int i = 0; i < hexBytes.length; i++) {
                dataBytes[i] = (byte) Integer.parseInt(hexBytes[i], 16);
            }

            protocol.sendCANFrame(arbitrationId, dataBytes);

        } catch (Exception e) {
            Log.e(TAG, "Failed to send CAN command: " + arbitrationId + " data=" + data, e);
        }
    }

    /**
     * Send throttle command to DME.
     */
    public void sendThrottle(KDCANProtocol protocol, double percent) {
        int throttleValue = Math.min(255, Math.max(0, (int) (percent * 2.55)));
        String data = String.format("00 00 %02X 00 00 00 00", throttleValue);
        sendCommand(protocol, "0x130", data);

        // Redundancy channel
        int throttleRedundant = Math.min(255, Math.max(0, (int) (percent * 2.55 * 0.97)));
        String data2 = String.format("00 00 %02X 00 00 00 00", throttleRedundant);
        sendCommand(protocol, "0x131", data2);
    }

    /**
     * Send brake command to DSC.
     */
    public void sendBrake(KDCANProtocol protocol, double percent) {
        int brakeValue = Math.min(255, Math.max(0, (int) (percent * 2.55)));
        String data = String.format("00 %02X 00 00 00 00 00", brakeValue);
        sendCommand(protocol, "0x0A8", data);
    }

    /**
     * Send steering angle to AFS.
     */
    public void sendSteering(KDCANProtocol protocol, double angle) {
        int angleValue = Math.min(5400, Math.max(0, (int) ((angle + 540) * 10)));
        byte high = (byte) ((angleValue >> 8) & 0xFF);
        byte low = (byte) (angleValue & 0xFF);
        String data = String.format("%02X %02X 00 00 00 00 00 00", high, low);
        sendCommand(protocol, "0x0C0", data);
    }

    /**
     * Emergency engine shutdown.
     */
    public void emergencyShutdown(KDCANProtocol protocol) {
        sendCommand(protocol, "0x130", "00 00 00 00 00 00 00 00");
        sendCommand(protocol, "0x131", "00 00 00 00 00 00 00 00");
        sendCommand(protocol, "0x0A8", "00 FF 00 00 00 00 00");
    }

    /**
     * Enable steering override signal.
     */
    public void setSteeringOverride(KDCANProtocol protocol, boolean active) {
        String data = active ? "01 01 00 00 00 00 00 00" : "00 00 00 00 00 00 00 00";
        sendCommand(protocol, "0x1B6", data);
    }
}