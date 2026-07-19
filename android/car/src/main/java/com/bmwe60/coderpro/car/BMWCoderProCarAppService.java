package com.bmwe60.coderpro.car;

import android.content.Intent;
import android.content.pm.ApplicationInfo;

import androidx.car.app.CarAppService;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;
import androidx.annotation.NonNull;

import com.bmwe60.coderpro.car.screens.MainScreen;

/**
 * BMW E60 Coder Pro - Android Auto Host Service
 */
public class BMWCoderProCarAppService extends CarAppService {

    @Override
    @NonNull
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @Override
    @NonNull
    public Session onCreateSession() {
        return new Session() {
            @Override
            @NonNull
            public Screen onCreateScreen(@NonNull Intent intent) {
                return new MainScreen(getCarContext());
            }
        };
    }
}
