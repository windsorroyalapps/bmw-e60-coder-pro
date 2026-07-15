package com.bmwe60.coderpro.car;

import android.content.Intent;
import android.content.pm.ApplicationInfo;

import androidx.car.app.CarAppService;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;
import androidx.annotation.NonNull;

/**
 * BMW E60 Coder Pro - Android Auto Host Service
 * Provides gauge data and tuning status to the car's head unit display.
 */
public class BMWCoderProCarAppService extends CarAppService {

    @Override
    @NonNull
    public HostValidator createHostValidator() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
        }
        return new HostValidator.Builder(getApplicationContext())
                .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample_app)
                .build();
    }

    @Override
    @NonNull
    public Session onCreateSession() {
        return new Session() {
            @Override
            @NonNull
            public Screen onCreateScreen(@NonNull Intent intent) {
                return new CarAppActivity(getCarContext());
            }
        };
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }
}
