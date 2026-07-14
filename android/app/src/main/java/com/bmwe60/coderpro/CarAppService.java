package com.bmwe60.coderpro;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;
import com.bmwe60.coderpro.car.ScreenManager;

/**
 * CarAppService - Android Auto projection service
 * Declares the car app session and host validation for headunit projection.
 */
public class CarAppService extends CarAppService {

    @NonNull
    @Override
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new ScreenManager();
    }
}
