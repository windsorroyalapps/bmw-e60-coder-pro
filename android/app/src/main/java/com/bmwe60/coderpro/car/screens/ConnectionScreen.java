package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Template;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;

/**
 * ConnectionScreen - OBD2 connection status and diagnostics
 */
public class ConnectionScreen extends Screen {

    public ConnectionScreen(@NonNull Screen.ScreenListener listener) {
        super(listener);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new PaneTemplate.Builder()
                .setTitle("OBD2 Connection")
                .setHeaderAction(Action.BACK)
                .addRow(new Row.Builder()
                        .setTitle("Status")
                        .addText("Connecting...")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Vehicle")
                        .addText("BMW E60")
                        .build())
                .build();
    }
}
