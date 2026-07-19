package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import com.bmwe60.coderpro.car.R;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.model.CarColor;

import com.bmwe60.coderpro.car.obd.KDCANManager;
import java.util.List;

public class DTCScreen extends Screen {
    public DTCScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();
        
        List<String[]> activeCodes = KDCANManager.getInstance().readActiveDTCs();

        if (activeCodes.isEmpty()) {
            listBuilder.addItem(new Row.Builder()
                    .setTitle(getCarContext().getString(R.string.dtc_none_title))
                    .addText(getCarContext().getString(R.string.dtc_none_desc))
                    .build());
        } else {
            for (String[] code : activeCodes) {
                listBuilder.addItem(new Row.Builder()
                        .setTitle(code[0])
                        .addText(code[1])
                        .build());
            }
        }

        return new ListTemplate.Builder()
                .setTitle(getCarContext().getString(R.string.dtc_title))
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .setActionStrip(new androidx.car.app.model.ActionStrip.Builder()
                        .addAction(new Action.Builder()
                                .setTitle(getCarContext().getString(R.string.dtc_clear_all))
                                .setBackgroundColor(CarColor.RED)
                                .setOnClickListener(() -> {
                                    KDCANManager.getInstance().clearAllDTCs();
                                    CarToast.makeText(getCarContext(), getCarContext().getString(R.string.dtc_clearing), CarToast.LENGTH_SHORT).show();
                                    invalidate();
                                })
                                .build())
                        .addAction(new Action.Builder()
                                .setTitle(getCarContext().getString(R.string.refresh))
                                .setOnClickListener(this::invalidate)
                                .build())
                        .build())
                .build();
    }
}
