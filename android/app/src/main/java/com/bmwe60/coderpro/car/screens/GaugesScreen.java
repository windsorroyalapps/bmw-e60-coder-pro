package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Template;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;

/**
 * GaugesScreen - Live gauge display for RPM, temperature, boost, etc.
 */
public class GaugesScreen extends Screen {

    public GaugesScreen(@NonNull Screen.ScreenListener listener) {
        super(listener);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new PaneTemplate.Builder()
                .setTitle("Live Gauges")
                .setHeaderAction(Action.BACK)
                .addRow(new Row.Builder()
                        .setTitle("RPM")
                        .addText("0")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Temperature")
                        .addText("85°C")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Boost")
                        .addText("0.0 bar")
                        .build())
                .build();
    }
}
