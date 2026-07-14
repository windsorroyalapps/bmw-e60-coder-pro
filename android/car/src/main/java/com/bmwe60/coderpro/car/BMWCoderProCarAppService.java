// BMW E60 Coder Pro - Android Auto Car App Service
// Provides the main entry point for the Android Auto projection.
// Isolated in the :car module to prevent build conflicts.

package com.bmwe60.coderpro.car;

import android.content.Intent;
import android.content.pm.ApplicationInfo;

import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;
import androidx.car.app.Screen;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Action;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.annotation.NonNull;

/**
 * Main Android Auto service for BMW E60 Coder Pro.
 * Hosts the car app screens and handles projection lifecycle.
 */
public class BMWCoderProCarAppService extends CarAppService {

    @Override
    @NonNull
    public HostValidator createHostValidator() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
        }
        return new HostValidator.Builder(getApplicationContext())
                .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample)
                .build();
    }

    @Override
    @NonNull
    public Session onCreateSession() {
        return new CoderProSession();
    }

    /**
     * Main session that hosts the car app screens.
     */
    public static class CoderProSession extends Session {
        @Override
        @NonNull
        public Screen onCreateScreen(@NonNull Intent intent) {
            return new DashboardScreen(getCarContext());
        }
    }

    /**
     * Main dashboard screen shown on Android Auto head unit.
     */
    public static class DashboardScreen extends Screen implements DefaultLifecycleObserver {

        public DashboardScreen(@NonNull androidx.car.app.CarContext carContext) {
            super(carContext);
            getLifecycle().addObserver(this);
        }

        @Override
        @NonNull
        public androidx.car.app.model.Template onGetTemplate() {
            Row rpmRow = new Row.Builder()
                    .setTitle("RPM")
                    .addText("Live engine data from OBD2")
                    .build();

            Row boostRow = new Row.Builder()
                    .setTitle("Boost Pressure")
                    .addText("Turbocharger performance")
                    .build();

            Row tempRow = new Row.Builder()
                    .setTitle("Coolant Temperature")
                    .addText("Engine thermal status")
                    .build();

            Pane pane = new Pane.Builder()
                    .addRow(rpmRow)
                    .addRow(boostRow)
                    .addRow(tempRow)
                    .build();

            return new PaneTemplate.Builder(pane)
                    .setHeaderAction(Action.APP_ICON)
                    .setTitle("BMW E60 Coder Pro")
                    .build();
        }

        @Override
        public void onStart(@NonNull LifecycleOwner owner) {
            // Start OBD2 data updates when screen is visible
        }

        @Override
        public void onStop(@NonNull LifecycleOwner owner) {
            // Stop OBD2 data updates when screen is hidden
        }
    }
}
