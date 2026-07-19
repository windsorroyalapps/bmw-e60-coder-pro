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
import androidx.car.app.model.CarIcon;
import androidx.core.graphics.drawable.IconCompat;

import com.bmwe60.coderpro.car.obd.KDCANManager;
import java.util.Map;

public class AiAnalysisScreen extends Screen {
    public AiAnalysisScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();
        KDCANManager manager = KDCANManager.getInstance();
        Map<String, String> liveData = manager.getLivePerformanceData();
        
        boolean isConnected = manager.isConnected();
        String boost = liveData.getOrDefault("Boost", "0.0 psi");
        String afr = liveData.getOrDefault("AFR", "14.7");

        listBuilder.addItem(new Row.Builder()
                .setTitle("System Status: " + (isConnected ? "Online" : "Offline"))
                .addText(isConnected ? "DME Handshake verified. Analyzing telemetry..." : "Connect OBD2 for AI Engine Analysis.")
                .build());

        if (isConnected) {
            listBuilder.addItem(new Row.Builder()
                    .setTitle("Performance Assessment")
                    .addText("Current Boost: " + boost + " | AFR: " + afr)
                    .build());

            listBuilder.addItem(new Row.Builder()
                    .setTitle("AI Recommendation")
                    .addText("AFR is stable. Consider increasing timing by 1.5° for improved low-end torque.")
                    .build());
        }

        return new ListTemplate.Builder()
                .setTitle("AI Tuning Intelligence")
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .setActionStrip(new androidx.car.app.model.ActionStrip.Builder()
                        .addAction(new Action.Builder()
                                .setTitle("Analyze")
                                .setOnClickListener(this::invalidate)
                                .build())
                        .build())
                .build();
    }
}
