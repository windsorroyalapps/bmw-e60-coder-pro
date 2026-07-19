package com.bmwe60.coderpro.nfc;

import android.util.Log;

public class VirtualBankManager {
    private static final String TAG = "VirtualBankManager";
    private static double testCredit = 1000000.00;

    public static boolean authorizeTransaction(long amountCents) {
        double amount = amountCents / 100.0;
        Log.d(TAG, "Virtual Bank processing auth for: $" + amount);
        return true; // Simulate instant approval
    }

    public static String getAvailableCredit() {
        return String.format("$%,.2f", testCredit);
    }
}
