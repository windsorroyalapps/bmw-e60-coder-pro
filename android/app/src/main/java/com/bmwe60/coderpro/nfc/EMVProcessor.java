package com.bmwe60.coderpro.nfc;

import java.util.HashMap;
import java.util.Map;
import java.nio.ByteBuffer;

/**
 * Basic EMV Kernel for Contactless Transactions (Kernel 2/3 focus).
 * Handles TVR, CVM, and Application Cryptogram generation for Australian fuel pumps.
 */
public class EMVProcessor {
    
    // Tag Definitions
    public static final String TAG_FCI_TEMPLATE = "6F";
    public static final String TAG_DF_NAME = "84";
    public static final String TAG_FCI_PROPRIETARY = "A5";
    public static final String TAG_AIP = "82";
    public static final String TAG_AFL = "94";
    public static final String TAG_PAN = "5A";
    public static final String TAG_EXPIRY = "5F24";
    public static final String TAG_TRACK2 = "57";
    public static final String TAG_PAN_SEQ = "5F34";
    public static final String TAG_CRYPTOGRAM = "9F26";
    public static final String TAG_CID = "9F27";

    /**
     * Generates a "Get Processing Options" (GPO) Response.
     * AFL 08 01 02 00 -> SFI 1, Records 1 and 2.
     */
    public static byte[] getGpoResponse() {
        // AIP: 0040 (Support for CDA)
        // AFL: 08 01 02 00 (SFI 1, Record 1 to 2)
        return hexToBytes("770A82020040940408010200"); 
    }

    /**
     * Returns Record 1: Contains PAN, Expiry, and Usage Controls.
     */
    public static byte[] getReadRecord1Response(String pan, String expiry) {
        // Tag 5A (PAN), Tag 5F24 (Expiry YYMMDD), Tag 5F34 (Seq 01), Tag 50 (Label)
        // Tag 9F07 (AUC - Application Usage Control), Tag 5F28 (Issuer Country Code)
        String panHex = pan;
        if (panHex.length() % 2 != 0) panHex += "F";
        
        String expiryHex = expiry + "31"; // Assuming end of month (YYMMDD)
        
        String data = "5A" + String.format("%02X", panHex.length()/2) + panHex
                    + "5F2403" + expiryHex
                    + "5F340101"
                    + "9F0702FF00" // AUC: All services allowed
                    + "5F28020036" // Issuer Country: Australia (036)
                    + "500456495341"; // "VISA" label
        
        String record = "70" + String.format("%02X", data.length()/2) + data;
        return hexToBytes(record + "9000");
    }

    /**
     * Returns Record 2: Contains Track 2 Equivalent Data and CDOL1.
     */
    public static byte[] getReadRecord2Response(String pan, String expiry) {
        // Tag 57 (Track 2 Equivalent Data)
        String track2 = pan + "D" + expiry + "2010000000000";
        if (track2.length() % 2 != 0) track2 += "F";
        
        // Tag 8C (CDOL1): Terminal Data for Generate AC
        // 9F02(6) + 9F03(6) + 9F1A(2) + 95(5) + 5F2A(2) + 9A(3) + 9C(1) + 9F37(4) = 29 bytes (0x1D)
        String cdol1 = "8C1D9F02069F03069F1A0295055F2A029A039C019F3704";
        
        String data = "57" + String.format("%02X", track2.length()/2) + track2 + cdol1;
        String record = "70" + String.format("%02X", data.length()/2) + data;
        return hexToBytes(record + "9000");
    }

    /**
     * Extracts the transaction amount from the GENERATE AC command data.
     * Based on CDOL1: 9F02 is the first 6 bytes.
     */
    public static long extractAmount(byte[] cdolData) {
        if (cdolData.length < 5) return 0;
        // CDOL1 data starts after the command header (80 AE ...)
        // In our case, the terminal sends the data directly according to CDOL1
        // Tag 9F02 is 6 bytes BCD
        long amount = 0;
        for (int i = 0; i < 6 && i < cdolData.length; i++) {
            amount = (amount * 100) + ((((cdolData[i] >> 4) & 0x0F) * 10) + (cdolData[i] & 0x0F));
        }
        return amount;
    }

    private static HSMManager hsmManager = new HSMManager();
    private static int atc = 1;

    /**
     * Generates an ARQC response using the HSM simulation.
     */
    public static byte[] generateArqcResponse(long amount) {
        try {
            // Prepare transaction data for signing (simplified)
            // In real EMV, this includes Amount, Unpredictable Number, ATC, etc.
            byte[] transactionData = new byte[16];
            ByteBuffer.wrap(transactionData).putLong(amount).putInt(atc);
            
            byte[] sessionKey = hsmManager.deriveSessionKey(atc);
            byte[] arqc = hsmManager.calculateARQC(sessionKey, transactionData);
            
            atc++; // Increment Application Transaction Counter
            
            String arqcHex = bytesToHex(arqc);
            return hexToBytes("77189F2608" + arqcHex + "9F2701809F100706010A030000009000");
        } catch (Exception e) {
            e.printStackTrace();
            return hexToBytes("6985"); // Declined
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }

    public static byte[] hexToBytes(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                 + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    public static boolean validateLuhn(String number) {
        int sum = 0;
        boolean alternate = false;
        for (int i = number.length() - 1; i >= 0; i--) {
            int n = Integer.parseInt(number.substring(i, i + 1));
            if (alternate) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alternate = !alternate;
        }
        return (sum % 10 == 0);
    }

    /**
     * Generates a rolling PAN that passes Luhn validation.
     * Uses a base prefix (IIN) and a variable body.
     */
    public static String generateRollingPan(String prefix, int length) {
        StringBuilder sb = new StringBuilder(prefix);
        // Generate random digits for the body (excluding prefix and the last check digit)
        while (sb.length() < length - 1) {
            sb.append((int) (Math.random() * 10));
        }

        // Calculate Luhn check digit
        int sum = 0;
        boolean alternate = true;
        for (int i = sb.length() - 1; i >= 0; i--) {
            int n = Integer.parseInt(sb.substring(i, i + 1));
            if (alternate) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alternate = !alternate;
        }

        int checkDigit = (10 - (sum % 10)) % 10;
        sb.append(checkDigit);
        
        return sb.toString();
    }
}
