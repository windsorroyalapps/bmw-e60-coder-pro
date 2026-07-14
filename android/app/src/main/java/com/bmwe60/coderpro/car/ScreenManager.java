package com.bmwe60.coderpro.car;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import com.bmwe60.coderpro.car.screens.HomeScreen;

/**
 * ScreenManager - Manages car app screens and navigation
 * Controls which screen is displayed on the headunit.
 */
public class ScreenManager extends Session {

    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        // Start with the home screen
        return new HomeScreen(getCarContext());
    }
}
