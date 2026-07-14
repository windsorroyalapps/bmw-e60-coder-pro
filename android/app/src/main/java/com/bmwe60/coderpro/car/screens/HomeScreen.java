package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.Template;
import androidx.car.app.model.GridTemplate;
import androidx.car.app.model.Row;
import androidx.core.graphics.drawable.IconCompat;
import com.bmwe60.coderpro.R;

/**
 * HomeScreen - Main entry screen for BMW E60 Coder Pro on the headunit
 * Displays primary functions: Connection, Gauges, Tuning, Flash, Controller
 */
public class HomeScreen extends Screen {

    public HomeScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new GridTemplate.Builder()
                .setTitle("BMW E60 Coder Pro")
                .setHeaderAction(Action.APP_ICON)
                .addList(
                        new GridTemplate.GridItemList.Builder()
                                .addItem(
                                        new GridTemplate.GridItem.Builder()
                                                .setTitle("Connect")
                                                .setImage(new CarIcon.Builder(
                                                        IconCompat.createWithResource(getCarContext(), R.drawable.ic_launcher_foreground)
                                                ).build())
                                                .setOnClickListener(() -> getScreenManager().push(new ConnectionScreen(getCarContext())))
                                                .build()
                                )
                                .addItem(
                                        new GridTemplate.GridItem.Builder()
                                                .setTitle("Gauges")
                                                .setImage(new CarIcon.Builder(
                                                        IconCompat.createWithResource(getCarContext(), R.drawable.ic_launcher_foreground)
                                                ).build())
                                                .setOnClickListener(() -> getScreenManager().push(new GaugesScreen(getCarContext())))
                                                .build()
                                )
                                .addItem(
                                        new GridTemplate.GridItem.Builder()
                                                .setTitle("Tuning")
                                                .setImage(new CarIcon.Builder(
                                                        IconCompat.createWithResource(getCarContext(), R.drawable.ic_launcher_foreground)
                                                ).build())
                                                .setOnClickListener(() -> getScreenManager().push(new TuningScreen(getCarContext())))
                                                .build()
                                )
                                .addItem(
                                        new GridTemplate.GridItem.Builder()
                                                .setTitle("Flash")
                                                .setImage(new CarIcon.Builder(
                                                        IconCompat.createWithResource(getCarContext(), R.drawable.ic_launcher_foreground)
                                                ).build())
                                                .setOnClickListener(() -> getScreenManager().push(new FlashScreen(getCarContext())))
                                                .build()
                                )
                                .build()
                )
                .build();
    }
}
