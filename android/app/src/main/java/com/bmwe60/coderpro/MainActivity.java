package com.bmwe60.coderpro;

import com.getcapacitor.BridgeActivity;
import com.bmwe60.coderpro.plugin.OBD2BridgePlugin;
import android.os.Bundle;
import android.view.WindowManager;

/**
 * BMW E60 Coder Pro - Android Auto Mobile Projection App
 * 
 * This app runs on your Android phone and projects to your E60 headunit
 * via Android Auto. Connect your phone to the headunit's USB port and
 * the app will appear on the headunit screen.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register OBD2 native bridge plugin
        registerPlugin(OBD2BridgePlugin.class);
        
        // Keep screen on during flash operations
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
    }
}
