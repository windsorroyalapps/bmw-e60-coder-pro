package com.bmwe60.coderpro.car.screens;

import com.bmwe60.coderpro.car.R;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.GridItem;
import androidx.car.app.model.GridTemplate;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Template;
import androidx.core.graphics.drawable.IconCompat;

public class MainScreen extends Screen {

    public MainScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.dashboard_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_compass)).build())
                        .setOnClickListener(() -> getScreenManager().push(new DashboardScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.dtc_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_dialog_alert)).build())
                        .setOnClickListener(() -> getScreenManager().push(new DTCScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.logs_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_recent_history)).build())
                        .setOnClickListener(() -> getScreenManager().push(new LogsScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.tuning_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_manage)).build())
                        .setOnClickListener(() -> getScreenManager().push(new TuningScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.ai_analysis_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_view)).build())
                        .setOnClickListener(() -> getScreenManager().push(new AiAnalysisScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.settings_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_preferences)).build())
                        .setOnClickListener(() -> getScreenManager().push(new SettingsScreen(getCarContext())))
                        .build()
        );

        listBuilder.addItem(
                new GridItem.Builder()
                        .setTitle(getCarContext().getString(R.string.gamepad_title))
                        .setImage(new CarIcon.Builder(IconCompat.createWithResource(getCarContext(), android.R.drawable.ic_menu_info_details)).build())
                        .setOnClickListener(() -> getScreenManager().push(new GamepadScreen(getCarContext())))
                        .build()
        );

        return new GridTemplate.Builder()
                .setTitle(getCarContext().getString(R.string.car_app_name))
                .setHeaderAction(Action.APP_ICON)
                .setSingleList(listBuilder.build())
                .build();
    }
}
