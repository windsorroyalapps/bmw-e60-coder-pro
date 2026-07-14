package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Template;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;

/**
 * TuningScreen - Map selection and tuning adjustments
 */
public class TuningScreen extends Screen {

    public TuningScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new PaneTemplate.Builder()
                .setTitle("AI Tuning")
                .setHeaderAction(Action.BACK)
                .addRow(new Row.Builder()
                        .setTitle("Current Map")
                        .addText("Stock")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Engine")
                        .addText("N54")
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Power")
                        .addText("306 hp")
                        .build())
                .build();
    }
}
