package com.bmwe60.coderpro;

import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;
import com.bmwe60.coderpro.car.ScreenManager;

/**
 * CarAppService - Android Automotive OS integration
 * Handles screen lifecycle and navigation for the car headunit display.
 */
public class CarAppService extends CarAppService {

    /**
     * Check the host is authorized to bind to this service.
     */
    @Override
    public HostValidator getHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    /**
     * Create a new session for the app.
     * Called when the app starts on the headunit.
     */
    @Override
    public Session onCreateSession() {
        return new ScreenManager();
    }
}
