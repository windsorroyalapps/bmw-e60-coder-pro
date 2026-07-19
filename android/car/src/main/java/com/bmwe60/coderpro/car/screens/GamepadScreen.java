package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.model.CarColor;

public class GamepadScreen extends Screen {
    public GamepadScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new ListTemplate.Builder()
                .setTitle("Controller Drive")
                .setHeaderAction(Action.BACK)
                .setSingleList(new ItemList.Builder()
                        .addItem(new Row.Builder()
                                .setTitle("Status")
                                .addText("Disconnected")
                                .build())
                        .addItem(new Row.Builder()
                                .setTitle("Drive Mode")
                                .addText("Comfort")
                                .build())
                        .addItem(new Row.Builder()
                                .setTitle("Safety Check")
                                .addText("Required before enabling")
                                .build())
                        .build())
                .build();
    }
}
