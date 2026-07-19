package com.bmwe60.coderpro.car.screens;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import com.bmwe60.coderpro.car.R;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.model.Toggle;

/**
 * Advanced Live Tuning Screen for BMW E60.
 * Controls DME, EGS, and DSC parameters in real-time.
 */
public class TuningScreen extends Screen {

    private static final String PREFS_NAME = "BMWTuningPrefs";
    private final SharedPreferences mPrefs;

    // Engine
    private boolean mExhaustFlapOpen;
    private int mBurbleLevel; 
    private boolean mMaxCooling;

    // Transmission
    private int mShiftSpeed;
    private int mLaunchRPM; // Index: 0=3k, 1=3.5k, 2=4k, 3=4.5k

    // Chassis
    private boolean mMTrackMode;
    private boolean mVMaxRemoved;
    private int mThrottleMap;

    public TuningScreen(@NonNull CarContext carContext) {
        super(carContext);
        mPrefs = carContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        loadSettings();
    }

    private String[] getBurbleLabels() {
        return new String[] {
            getCarContext().getString(R.string.burble_oem),
            getCarContext().getString(R.string.burble_soft),
            getCarContext().getString(R.string.burble_gts),
            getCarContext().getString(R.string.burble_aggressive)
        };
    }

    private String[] getLaunchLabels() {
        return new String[] {
            getCarContext().getString(R.string.rpm_3000),
            getCarContext().getString(R.string.rpm_3500),
            getCarContext().getString(R.string.rpm_4000),
            getCarContext().getString(R.string.rpm_4500)
        };
    }

    private void loadSettings() {
        mExhaustFlapOpen = mPrefs.getBoolean("exhaust_flap", false);
        mBurbleLevel = mPrefs.getInt("burble_level", 0);
        mMaxCooling = mPrefs.getBoolean("max_cooling", false);
        mShiftSpeed = mPrefs.getInt("shift_speed", 0);
        mLaunchRPM = mPrefs.getInt("launch_rpm", 1);
        mMTrackMode = mPrefs.getBoolean("m_track_mode", false);
        mVMaxRemoved = mPrefs.getBoolean("vmax_removed", false);
        mThrottleMap = mPrefs.getInt("throttle_map", 1);
    }

    private void saveSetting(String key, Object value) {
        SharedPreferences.Editor editor = mPrefs.edit();
        int intValue = 0;
        if (value instanceof Boolean) {
            editor.putBoolean(key, (Boolean) value);
            intValue = (Boolean) value ? 1 : 0;
        } else if (value instanceof Integer) {
            editor.putInt(key, (Integer) value);
            intValue = (Integer) value;
        }
        editor.apply();
        
        // Push live update to the car
        com.bmwe60.coderpro.car.obd.KDCANManager.getInstance().sendTuningCommand(key, intValue);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();
        String[] burbleLabels = getBurbleLabels();
        String[] launchLabels = getLaunchLabels();

        // --- ENGINE & THERMALS ---
        listBuilder.addItem(new Row.Builder()
                .setTitle(getCarContext().getString(R.string.max_cooling_title))
                .addText(getCarContext().getString(R.string.max_cooling_desc))
                .setToggle(new Toggle.Builder((checked) -> {
                    mMaxCooling = checked;
                    saveSetting("max_cooling", checked);
                    String msg = checked ? getCarContext().getString(R.string.cooling_max) : getCarContext().getString(R.string.cooling_normal);
                    CarToast.makeText(getCarContext(), msg, CarToast.LENGTH_SHORT).show();
                    invalidate();
                }).setChecked(mMaxCooling).build())
                .build());

        listBuilder.addItem(new Row.Builder()
                .setTitle(getCarContext().getString(R.string.burble_intensity))
                .addText(getCarContext().getString(R.string.burble_profile, burbleLabels[mBurbleLevel]))
                .setOnClickListener(() -> {
                    mBurbleLevel = (mBurbleLevel + 1) % burbleLabels.length;
                    saveSetting("burble_level", mBurbleLevel);
                    invalidate();
                })
                .build());

        // --- PERFORMANCE DRIVING ---
        listBuilder.addItem(new Row.Builder()
                .setTitle(getCarContext().getString(R.string.launch_control_title))
                .addText(getCarContext().getString(R.string.launch_control_current, launchLabels[mLaunchRPM]))
                .setOnClickListener(() -> {
                    mLaunchRPM = (mLaunchRPM + 1) % launchLabels.length;
                    saveSetting("launch_rpm", mLaunchRPM);
                    invalidate();
                })
                .build());

        listBuilder.addItem(new Row.Builder()
                .setTitle(getCarContext().getString(R.string.mtrack_mode_title))
                .addText(getCarContext().getString(R.string.mtrack_mode_desc))
                .setToggle(new Toggle.Builder((checked) -> {
                    mMTrackMode = checked;
                    saveSetting("m_track_mode", checked);
                    String msg = checked ? getCarContext().getString(R.string.mtrack_on) : getCarContext().getString(R.string.mtrack_off);
                    CarToast.makeText(getCarContext(), msg, CarToast.LENGTH_SHORT).show();
                    invalidate();
                }).setChecked(mMTrackMode).build())
                .build());

        // --- HARDWARE ---
        listBuilder.addItem(new Row.Builder()
                .setTitle(getCarContext().getString(R.string.exhaust_flap))
                .addText(mExhaustFlapOpen ? getCarContext().getString(R.string.exhaust_force_open) : getCarContext().getString(R.string.exhaust_auto))
                .setToggle(new Toggle.Builder((checked) -> {
                    mExhaustFlapOpen = checked;
                    saveSetting("exhaust_flap", checked);
                    invalidate();
                }).setChecked(mExhaustFlapOpen).build())
                .build());

        return new ListTemplate.Builder()
                .setTitle(getCarContext().getString(R.string.tuning_title))
                .setHeaderAction(Action.BACK)
                .setActionStrip(new ActionStrip.Builder()
                        .addAction(new Action.Builder()
                                .setTitle(getCarContext().getString(R.string.clear_adaptations))
                                .setOnClickListener(() -> CarToast.makeText(getCarContext(), getCarContext().getString(R.string.ecu_reset_sent), CarToast.LENGTH_SHORT).show())
                                .build())
                        .build())
                .setSingleList(listBuilder.build())
                .build();
    }
}
