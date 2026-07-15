package com.bmwe60.coderpro.car;

import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.*;
import androidx.annotation.NonNull;

/**
 * Android Auto main screen showing live OBD2 gauges.
 */
public class CarAppActivity extends Screen {

    public CarAppActivity(@NonNull CarContext carContext) {
        super(carContext);
    }

    @Override
    @NonNull
    public Template onGetTemplate() {
        return new GridTemplate.Builder()
                .setTitle("BMW E60 Coder Pro")
                .setHeaderAction(Action.APP_ICON)
                .setSingleList(
                        new ItemList.Builder()
                                .addItem(new Row.Builder()
                                        .setTitle("RPM")
                                        .addText("0")
                                        .setImage(new CarIcon.Builder(
                                                androidx.core.graphics.drawable.IconCompat.createWithResource(
                                                        getCarContext(), android.R.drawable.ic_menu_info_details)).build())
                                        .build())
                                .addItem(new Row.Builder()
                                        .setTitle("Boost")
                                        .addText("0.0 bar")
                                        .build())
                                .addItem(new Row.Builder()
                                        .setTitle("AFR")
                                        .addText("14.7")
                                        .build())
                                .addItem(new Row.Builder()
                                        .setTitle("IAT")
                                        .addText("25°C")
                                        .build())
                                .build())
                .build();
    }
}
