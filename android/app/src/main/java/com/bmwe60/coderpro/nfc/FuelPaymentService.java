package com.bmwe60.coderpro.nfc;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import java.util.Arrays;

import com.bmwe60.coderpro.nfc.vault.SecureTokenVault;

public class FuelPaymentService extends HostApduService {
    private static final String TAG = "FuelPaymentService";

    // Standard SELECT AID command
    private static final byte[] SELECT_AID_COMMAND = {(byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00};
    // PPSE (Proximity Payment System Environment) AID
    private static final byte[] PPSE_AID = {'2', 'P', 'A', 'Y', '.', 'S', 'Y', 'S', '.', 'D', 'D', 'F', '0', '1'};
    
    // GPO Command: 80 A8 00 00
    private static final byte[] GPO_COMMAND = {(byte) 0x80, (byte) 0xA8, (byte) 0x00, (byte) 0x00};
    // READ RECORD Command: 00 B2
    private static final byte[] READ_RECORD_COMMAND = {(byte) 0x00, (byte) 0xB2};
    // GENERATE AC Command: 80 AE
    private static final byte[] GENERATE_AC_COMMAND = {(byte) 0x80, (byte) 0xAE};

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null) return null;

        String hexCmd = bytesToHex(commandApdu);
        Log.d(TAG, "Received APDU: " + hexCmd);

        // 1. SELECT AID (PPSE or Visa/MC)
        if (isSelectAid(commandApdu)) {
            byte[] aid = extractAid(commandApdu);
            if (Arrays.equals(aid, PPSE_AID)) {
                return getPpseResponse();
            }
            Log.d(TAG, "Selected AID: " + bytesToHex(aid));
            return new byte[]{(byte) 0x90, 0x00}; // OK
        }

        // 2. GET PROCESSING OPTIONS (GPO)
        if (startsWith(commandApdu, GPO_COMMAND)) {
            Log.d(TAG, "GPO Requested - Terminal capabilities exchange");
            return EMVProcessor.getGpoResponse();
        }

        // 3. READ RECORD
        if (startsWith(commandApdu, READ_RECORD_COMMAND)) {
            int recordNumber = commandApdu[2] & 0xFF;
            Log.d(TAG, "Read Record Requested: " + recordNumber);
            try {
                String token = SecureTokenVault.getToken(this);
                if (token == null || !EMVProcessor.validateLuhn(token)) {
                    token = "4111111111111111"; // Valid Luhn fallback
                }
                
                if (recordNumber == 1) {
                    return EMVProcessor.getReadRecord1Response(token, "2512"); 
                } else if (recordNumber == 2) {
                    return EMVProcessor.getReadRecord2Response(token, "2512");
                }
            } catch (Exception e) {
                Log.e(TAG, "Read Record Error", e);
                return new byte[]{(byte) 0x6A, (byte) 0x82};
            }
        }

        // 4. GENERATE AC (Application Cryptogram) - This is the Pre-Auth / Auth step
        if (startsWith(commandApdu, GENERATE_AC_COMMAND)) {
            Log.d(TAG, "Generate AC Requested");
            
            // Terminal sends CDOL1 (First Gen AC) or CDOL2 (Second Gen AC)
            byte[] cdolData = new byte[commandApdu.length - 5];
            System.arraycopy(commandApdu, 5, cdolData, 0, cdolData.length);
            
            // P1 = 0x80 (ARQC - Request for Online Auth)
            // P1 = 0x40 (TC - Transaction Certificate / Completion)
            byte p1 = commandApdu[2];
            
            if (p1 == (byte) 0x80) {
                long preAuthAmount = EMVProcessor.extractAmount(cdolData);
                Log.i(TAG, ">>> PUMP PRE-AUTH REQUEST (ARQC): $" + (preAuthAmount / 100.0));
                
                boolean approved = VirtualBankManager.authorizeTransaction(preAuthAmount);
                if (approved) {
                    return EMVProcessor.generateArqcResponse(preAuthAmount);
                } else {
                    return new byte[]{(byte) 0x69, (byte) 0x85};
                }
            } else if (p1 == (byte) 0x40) {
                Log.i(TAG, ">>> PUMP COMPLETION REQUEST (TC)");
                // This is where the transaction is finalized
                settleTransactionLocally();
                return EMVProcessor.generateArqcResponse(0); // Return TC response
            }
        }

        return new byte[]{(byte) 0x6F, 0x00}; // Command not supported
    }

    private void settleTransactionLocally() {
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL("http://localhost:8080/SETTLE");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Local Settlement Response: " + responseCode);
            } catch (Exception e) {
                Log.e(TAG, "Failed to settle locally", e);
            }
        }).start();
    }

    private void notifyUserOfTransaction(long amountCents) {
        // Send a broadcast to MainActivity/Capacitor to show a notification in the UI
        android.content.Intent intent = new android.content.Intent("com.bmwe60.coderpro.FUEL_TRANSACTION");
        intent.putExtra("amount", amountCents / 100.0);
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
        
        Log.d(TAG, "Broadcasted fuel transaction: $" + (amountCents / 100.0));
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private byte[] extractAid(byte[] apdu) {
        int length = apdu[4] & 0xFF;
        byte[] aid = new byte[length];
        System.arraycopy(apdu, 5, aid, 0, length);
        return aid;
    }

    private byte[] getPpseResponse() {
        // Minimum PPSE response indicating we have a payment applet
        // This usually contains the proprietary template (BF0C) with the AID list
        return new byte[] {
            (byte)0x6F, 0x23, // FCI Template
            (byte)0x84, 0x0E, '2', 'P', 'A', 'Y', '.', 'S', 'Y', 'S', '.', 'D', 'D', 'F', '0', '1',
            (byte)0xA5, 0x11, // Proprietary Template
            (byte)0xBF, 0x0C, 0x0E, // FCI Issuer Discretionary Data
            (byte)0x61, 0x0C, // Directory Entry
            (byte)0x4F, 0x07, (byte)0xA0, 0x00, 0x00, 0x00, 0x04, 0x10, 0x10, // AID (MasterCard)
            (byte)0x87, 0x01, 0x01, // Priority
            (byte)0x90, 0x00 // OK
        };
    }

    @Override
    public void onDeactivated(int reason) {
        Log.d(TAG, "Deactivated reason: " + reason);
    }

    private boolean isSelectAid(byte[] apdu) {
        if (apdu.length < SELECT_AID_COMMAND.length) return false;
        for (int i = 0; i < SELECT_AID_COMMAND.length; i++) {
            if (apdu[i] != SELECT_AID_COMMAND[i]) return false;
        }
        return true;
    }

    private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();
    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }
}
