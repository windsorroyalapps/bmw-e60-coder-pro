package com.bmwe60.coderpro.car.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import com.bmwe60.coderpro.car.R;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.model.CarIcon;
import androidx.core.graphics.drawable.IconCompat;

import com.bmwe60.coderpro.car.obd.KDCANManager;
import java.util.Map;

public class LogsScreen extends Screen {
    private boolean mIsLogging = false;

    public LogsScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();
        
        KDCANManager manager = KDCANManager.getInstance();
        Map<String, String> liveData = manager.getLivePerformanceData();

        // --- LIVE METRICS ---
        for (Map.Entry<String, String> entry : liveData.entrySet()) {
            listBuilder.addItem(new Row.Builder()
                    .setTitle(entry.getKey())
                    .addText(entry.getValue())
                    .build());
        }

        // --- RECENT LOGS ---
        listBuilder.addItem(new Row.Builder()
                .setTitle("Log_20240719_1730")
                .addText(getCarContext().getString(R.string.log_detail_format, "15:20", "4500"))
                .build());

        return new ListTemplate.Builder()
                .setTitle(mIsLogging ? getCarContext().getString(R.string.logs_recording) : getCarContext().getString(R.string.logs_title))
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .setActionStrip(new androidx.car.app.model.ActionStrip.Builder()
                        .addAction(new Action.Builder()
                                .setTitle(mIsLogging ? getCarContext().getString(R.string.stop) : getCarContext().getString(R.string.record))
                                .setBackgroundColor(mIsLogging ? CarColor.RED : CarColor.GREEN)
                                .setOnClickListener(() -> {
                                    mIsLogging = !mIsLogging;
                                    String msg = mIsLogging ? getCarContext().getString(R.string.logging_started) : getCarContext().getString(R.string.log_saved);
                                    CarToast.makeText(getCarContext(), msg, CarToast.LENGTH_SHORT).show();
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
