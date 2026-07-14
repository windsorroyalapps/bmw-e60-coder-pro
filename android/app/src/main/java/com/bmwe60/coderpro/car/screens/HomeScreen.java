package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.GridItem;
import androidx.car.app.model.GridTemplate;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Template;

/**
 * HomeScreen - Main entry screen for BMW E60 Coder Pro on the headunit
 */
public class HomeScreen extends Screen {

    public HomeScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        listBuilder.addItem(
            new GridItem.Builder()
                .setTitle("Connect")
                .setOnClickListener(() -> getScreenManager().push(new ConnectionScreen(getCarContext())))
                .build()
        );

        listBuilder.addItem(
            new GridItem.Builder()
                .setTitle("Gauges")
                .setOnClickListener(() -> getScreenManager().push(new GaugesScreen(getCarContext())))
                .build()
        );

        listBuilder.addItem(
            new GridItem.Builder()
                .setTitle("Tuning")
                .setOnClickListener(() -> getScreenManager().push(new TuningScreen(getCarContext())))
                .build()
        );

        listBuilder.addItem(
            new GridItem.Builder()
                .setTitle("Flash")
                .setOnClickListener(() -> getScreenManager().push(new FlashScreen(getCarContext())))
                .build()
        );

        return new GridTemplate.Builder()
                .setTitle("BMW E60 Coder Pro")
                .setHeaderAction(Action.APP_ICON)
                .setSingleList(listBuilder.build())
                .build();
    }
}
