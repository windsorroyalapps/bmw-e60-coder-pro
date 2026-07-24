package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

import com.bmwe60.coderpro.car.R;
import com.bmwe60.coderpro.car.obd.KDCANManager;
import java.util.Map;

public class LogsScreen extends Screen {

    public LogsScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();
        
        Map<String, String> liveData = KDCANManager.getInstance().getLivePerformanceData();
        
        if (liveData.isEmpty()) {
            listBuilder.addItem(new Row.Builder()
                .setTitle("No Data Available")
                .addText("Connect to vehicle to view live data")
                .build());
        } else {
            for (Map.Entry<String, String> entry : liveData.entrySet()) {
                listBuilder.addItem(new Row.Builder()
                    .setTitle(entry.getKey())
                    .addText(entry.getValue())
                    .build());
            }
        }

        return new ListTemplate.Builder()
            .setSingleList(listBuilder.build())
            .setTitle("Live Data Logs")
            .setHeaderAction(Action.BACK)
            .build();
    }
}
