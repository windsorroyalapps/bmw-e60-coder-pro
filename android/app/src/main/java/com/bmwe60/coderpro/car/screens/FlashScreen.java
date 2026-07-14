package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Template;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;

/**
 * FlashScreen - DME flash operations (Quick, Full, Live)
 */
public class FlashScreen extends Screen {

    public FlashScreen(@NonNull Screen.ScreenListener listener) {
        super(listener);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new PaneTemplate.Builder()
                .setTitle("DME Flash")
                .setHeaderAction(Action.BACK)
                .addRow(new Row.Builder()
                        .setTitle("Flash Mode")
                        .addText("Ready")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Safety Checks")
                        .addText("All Passed")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Battery Voltage")
                        .addText("14.2V")
                        .build())
                .build();
    }
}
