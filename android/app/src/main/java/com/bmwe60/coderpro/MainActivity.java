package com.bmwe60.coderpro;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.Plugin;
import com.getcapacitor.JSObject;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.WindowManager;

import java.util.HashMap;

/**
 * BMW E60 Coder Pro - MainActivity
 * Handles USB K+DCAN cable detection, gamepad input, and OBD2 communication
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "E60CoderPro";
    private static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";

    private UsbManager usbManager;
    private PendingIntent usbPermissionIntent;
    private UsbDeviceConnection currentConnection;
    private boolean usbPermissionGranted = false;

    // Gamepad state tracking
    private float leftStickX = 0f, leftStickY = 0f;
    private float rightStickX = 0f, rightStickY = 0f;
    private float leftTrigger = 0f, rightTrigger = 0f;
    private boolean driveModeActive = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on during flash operations
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize USB manager
        usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
        usbPermissionIntent = PendingIntent.getBroadcast(this, 0,
                new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_MUTABLE);

        // Register USB permission broadcast receiver
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        registerReceiver(usbReceiver, filter);

        // Check for already-attached USB devices
        scanForUsbDevices();

        Log.i(TAG, "BMW E60 Coder Pro initialized");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterReceiver(usbReceiver);
        if (currentConnection != null) {
            currentConnection.close();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(intent.getAction())) {
            UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            if (device != null) {
                requestUsbPermission(device);
            }
        }
    }

    /**
     * Scan for connected USB devices and request permission
     */
    private void scanForUsbDevices() {
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        for (UsbDevice device : deviceList.values()) {
            if (isOBD2Device(device)) {
                Log.i(TAG, "Found OBD2 device: " + device.getVendorId() + ":" + device.getProductId());
                requestUsbPermission(device);
                break;
            }
        }
    }

    /**
     * Check if a USB device is a known OBD2/K+DCAN adapter
     */
    private boolean isOBD2Device(UsbDevice device) {
        int vid = device.getVendorId();
        int pid = device.getProductId();
        // FTDI FT232 (Genuine K+DCAN)
        if (vid == 0x0403 && (pid == 0x6001 || pid == 0x6010 || pid == 0x6011 || pid == 0x6014)) return true;
        // CH340/CH341 (Clone cables)
        if (vid == 0x1A86 && (pid == 0x7523 || pid == 0x5523)) return true;
        // CP2102/CP2104 (ENET)
        if (vid == 0x10C4 && (pid == 0xEA60 || pid == 0xEA70)) return true;
        // PL2303
        if (vid == 0x067B && pid == 0x2303) return true;
        // ELM327
        if (vid == 0x0403 && pid == 0xFA24) return true;
        return false;
    }

    /**
     * Request USB permission for a device
     */
    private void requestUsbPermission(UsbDevice device) {
        if (!usbManager.hasPermission(device)) {
            usbManager.requestPermission(device, usbPermissionIntent);
        } else {
            usbPermissionGranted = true;
            connectToDevice(device);
        }
    }

    /**
     * Open connection to the USB device
     */
    private void connectToDevice(UsbDevice device) {
        UsbDeviceConnection connection = usbManager.openDevice(device);
        if (connection != null) {
            currentConnection = connection;
            Log.i(TAG, "Connected to OBD2 device");
            // Notify web app of connection
            notifyWebApp("usbConnected", String.format("{\"vid\":%d,\"pid\":%d}",
                    device.getVendorId(), device.getProductId()));
        }
    }

    /**
     * Notify the web app via JavaScript bridge
     */
    private void notifyWebApp(String event, String data) {
        String js = String.format("window.dispatchEvent(new CustomEvent('%s', { detail: %s }));", event, data);
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    /**
     * USB Broadcast Receiver - handles permission grants and device attach/detach
     */
    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            usbPermissionGranted = true;
                            connectToDevice(device);
                        }
                    } else {
                        Log.w(TAG, "USB permission denied for device");
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (device != null && isOBD2Device(device)) {
                    requestUsbPermission(device);
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (currentConnection != null) {
                    currentConnection.close();
                    currentConnection = null;
                }
                usbPermissionGranted = false;
                notifyWebApp("usbDisconnected", "{}");
                Log.i(TAG, "OBD2 device disconnected");
            }
        }
    };

    // ============================================================
    // GAMEPAD INPUT HANDLING
    // ============================================================

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Capture gamepad button events and forward to web app
        if (isGamepadEvent(event)) {
            int keyCode = event.getKeyCode();
            boolean pressed = event.getAction() == KeyEvent.ACTION_DOWN;
            String buttonName = mapKeyCodeToButton(keyCode);
            if (buttonName != null) {
                String js = String.format(
                    "if(window.__gamepadNative)window.__gamepadNative.onButton('%s',%b);",
                    buttonName, pressed
                );
                bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(js, null));
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        // Capture gamepad axis events
        if (isGamepadMotionEvent(event)) {
            leftStickX = event.getAxisValue(MotionEvent.AXIS_X);
            leftStickY = event.getAxisValue(MotionEvent.AXIS_Y);
            rightStickX = event.getAxisValue(MotionEvent.AXIS_Z);
            rightStickY = event.getAxisValue(MotionEvent.AXIS_RZ);
            leftTrigger = event.getAxisValue(MotionEvent.AXIS_BRAKE);
            rightTrigger = event.getAxisValue(MotionEvent.AXIS_GAS);

            // Forward to web app
            String js = String.format(
                "if(window.__gamepadNative)window.__gamepadNative.onAxes(%.3f,%.3f,%.3f,%.3f,%.3f,%.3f);",
                leftStickX, leftStickY, rightStickX, rightStickY, leftTrigger, rightTrigger
            );
            bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(js, null));
            return true;
        }
        return super.dispatchGenericMotionEvent(event);
    }

    private boolean isGamepadEvent(KeyEvent event) {
        return (event.getSource() & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
                || (event.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    private boolean isGamepadMotionEvent(MotionEvent event) {
        return (event.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
                || (event.getSource() & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD;
    }

    private String mapKeyCodeToButton(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return "a";
            case KeyEvent.KEYCODE_BUTTON_B: return "b";
            case KeyEvent.KEYCODE_BUTTON_X: return "x";
            case KeyEvent.KEYCODE_BUTTON_Y: return "y";
            case KeyEvent.KEYCODE_BUTTON_L1: return "lb";
            case KeyEvent.KEYCODE_BUTTON_R1: return "rb";
            case KeyEvent.KEYCODE_BUTTON_L2: return "lt";
            case KeyEvent.KEYCODE_BUTTON_R2: return "rt";
            case KeyEvent.KEYCODE_BUTTON_SELECT: return "back";
            case KeyEvent.KEYCODE_BUTTON_START: return "start";
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return "leftStickBtn";
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return "rightStickBtn";
            case KeyEvent.KEYCODE_DPAD_UP: return "dpadUp";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "dpadDown";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "dpadLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "dpadRight";
            case KeyEvent.KEYCODE_BUTTON_MODE: return "xbox";
            default: return null;
        }
    }
}
