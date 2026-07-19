package com.bmwe60.coderpro.nfc;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.nio.ByteBuffer;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/**
 * HSMManager simulates a Hardware Security Module using Android's Keystore.
 * It manages Issuer Master Keys (IMK) and derives session keys for 
 * EMV cryptogram (ARQC) generation.
 */
public class HSMManager {
    private static final String KEY_ALIAS = "IssuerMasterKey_AC";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";

    public HSMManager() {
        try {
            ensureMasterKeyExists();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void ensureMasterKeyExists() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
            keyGenerator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_CBC)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build());
            keyGenerator.generateKey();
        }
    }

    /**
     * Derives a Session Key from the Master Key and Application Transaction Counter (ATC).
     * In real EMV, this uses Diversified Keys.
     */
    public byte[] deriveSessionKey(int atc) throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        SecretKey masterKey = (SecretKey) keyStore.getKey(KEY_ALIAS, null);

        // Simple derivation for simulation: SessionKey = AES-Encrypt(ATC)
        Cipher cipher = Cipher.getInstance("AES/CBC/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, masterKey);
        
        byte[] data = new byte[16];
        ByteBuffer.wrap(data).putInt(atc);
        
        return cipher.doFinal(data);
    }

    /**
     * Calculates the Application Cryptogram (ARQC) using AES-CMAC.
     * This mimics the process performed by an HSM during authorization.
     */
    public byte[] calculateARQC(byte[] sessionKey, byte[] transactionData) throws Exception {
        SecretKeySpec keySpec = new SecretKeySpec(sessionKey, "AES");
        Mac mac = Mac.getInstance("HmacSHA256"); // Using HMAC for high-strength simulation
        mac.init(keySpec);
        byte[] fullMac = mac.doFinal(transactionData);
        
        // Return first 8 bytes as the Cryptogram (standard EMV length)
        byte[] arqc = new byte[8];
        System.arraycopy(fullMac, 0, arqc, 0, 8);
        return arqc;
    }
}
