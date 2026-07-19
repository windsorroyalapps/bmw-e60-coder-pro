package com.bmwe60.coderpro.car.screens;

import com.bmwe60.coderpro.car.R;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.core.graphics.drawable.IconCompat;

/**
 * Immersive Dashboard Screen that renders like Google Maps using a Surface.
 */
public class DashboardScreen extends Screen implements SurfaceCallback {

    public DashboardScreen(@NonNull CarContext carContext) {
        super(carContext);
        // Register for surface updates to draw gauges
        carContext.getCarService(androidx.car.app.AppManager.class).setSurfaceCallback(this);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        return new NavigationTemplate.Builder()
                .setBackgroundColor(CarColor.SECONDARY)
                .setActionStrip(new ActionStrip.Builder()
                        .addAction(new Action.Builder()
                                .setTitle(getCarContext().getString(R.string.back))
                                .setOnClickListener(this::finish)
                                .build())
                        .addAction(new Action.Builder()
                                .setTitle(getCarContext().getString(R.string.settings_title))
                                .setOnClickListener(() -> getScreenManager().push(new SettingsScreen(getCarContext())))
                                .build())
                        .build())
                .build();
    }

    @Override
    public void onSurfaceAvailable(@NonNull SurfaceContainer surfaceContainer) {
        // This is where you would hook in your OpenGL or Canvas renderer
        // to draw the real-time BMW gauges onto the headunit background.
        drawMockGauges(surfaceContainer);
    }

    private void drawMockGauges(SurfaceContainer container) {
        // Example: Drawing onto the surface like a map would
        // In a real app, you'd use a loop tied to OBD2 data updates
    }

    @Override
    public void onSurfaceDestroyed(@NonNull SurfaceContainer surfaceContainer) {
    }
}
