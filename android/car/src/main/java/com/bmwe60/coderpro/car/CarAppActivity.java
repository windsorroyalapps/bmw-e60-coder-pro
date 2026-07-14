// BMW E60 Coder Pro - Android Auto Entry Activity
// Handles the intent to launch the car app on the phone (for testing).

package com.bmwe60.coderpro.car;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Entry activity for Android Auto.
 * This is required by the Car App library for phone-based testing.
 */
public class CarAppActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The actual UI is rendered by the CarAppService on the head unit.
        // This activity just finishes immediately on phone.
        finish();
    }
}
