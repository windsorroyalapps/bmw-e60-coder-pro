package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

/**
 * ConnectionScreen - OBD2 connection status
 */
public class ConnectionScreen extends Screen {

    public ConnectionScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Pane pane = new Pane.Builder()
                .addRow(new Row.Builder().setTitle("Status").addText("Connecting...").build())
                .addRow(new Row.Builder().setTitle("Vehicle").addText("BMW E60").build())
                .build();

        return new PaneTemplate.Builder()
                .setTitle("OBD2 Connection")
                .setHeaderAction(Action.BACK)
                .setSinglePane(pane)
                .build();
    }
}
