package com.bmwe60.coderpro.car.screens;

import com.bmwe60.coderpro.car.R;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

public class SettingsScreen extends Screen {
    public SettingsScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new ListTemplate.Builder()
                .setTitle(getCarContext().getString(R.string.settings_title))
                .setHeaderAction(Action.BACK)
                .setSingleList(new ItemList.Builder()
                        .addItem(new Row.Builder()
                                .setTitle(getCarContext().getString(R.string.engine_profile))
                                .addText("N54 Twin-Turbo")
                                .build())
                        .addItem(new Row.Builder()
                                .setTitle(getCarContext().getString(R.string.fuel_octane))
                                .addText("93 Octane")
                                .build())
                        .addItem(new Row.Builder()
                                .setTitle(getCarContext().getString(R.string.transmission))
                                .addText("6-Speed Manual")
                                .build())
                        .addItem(new Row.Builder()
                                .setTitle(getCarContext().getString(R.string.nfc_payment))
                                .addText("Enabled (**** 1234)")
                                .build())
                        .build())
                .build();
    }
}
