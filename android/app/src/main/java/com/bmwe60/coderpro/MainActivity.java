package com.bmwe60.coderpro;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.bmwe60.coderpro.plugin.OBD2BridgePlugin;
import com.bmwe60.coderpro.nfc.LocalBankServer;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String ACTION_USB_PERMISSION = "com.bmwe60.coderpro.USB_PERMISSION";
    private static final String ACTION_FUEL_TRANSACTION = "com.bmwe60.coderpro.FUEL_TRANSACTION";

    private LocalBankServer bankServer;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        Log.d(TAG, "USB Permission granted");
                        getBridge().triggerJSEvent("usbPermissionGranted", "window");
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                Log.d(TAG, "USB Cable attached");
                getBridge().triggerJSEvent("usbDeviceAttached", "window");
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                Log.d(TAG, "USB Cable detached");
                getBridge().triggerJSEvent("usbDeviceDetached", "window");
            } else if (ACTION_FUEL_TRANSACTION.equals(action)) {
                double amount = intent.getDoubleExtra("amount", 0.0);
                Log.d(TAG, "Fuel Transaction Broadcast Received: $" + amount);
                com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
                data.put("amount", amount);
                data.put("timestamp", intent.getLongExtra("timestamp", System.currentTimeMillis()));
                getBridge().triggerJSEvent("fuelTransactionVerified", "window", data.toString());
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(OBD2BridgePlugin.class);
        super.onCreate(savedInstanceState);

        // Start Local Bank Settlement Server
        bankServer = new LocalBankServer();
        bankServer.start();

        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        filter.addAction(ACTION_FUEL_TRANSACTION);
        registerReceiver(usbReceiver, filter, Context.RECEIVER_EXPORTED);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
    }

    @Override
    public void onDestroy() {
        try {
            unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receiver", e);
        }
        super.onDestroy();
    }
}
