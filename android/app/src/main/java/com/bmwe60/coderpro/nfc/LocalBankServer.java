package com.bmwe60.coderpro.nfc;

import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * LocalBankServer runs a background thread to handle "settlement" 
 * of the simulated fuel transactions.
 */
public class LocalBankServer {
    private static final String TAG = "LocalBankServer";
    private static final int PORT = 8080;
    private ServerSocket serverSocket;
    private boolean isRunning = false;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public void start() {
        if (isRunning) return;
        isRunning = true;
        executor.execute(() -> {
            try {
                serverSocket = new ServerSocket(PORT);
                Log.i(TAG, "Bank Settlement Server started on port " + PORT);
                while (isRunning) {
                    try (Socket client = serverSocket.accept();
                         BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
                         PrintWriter out = new PrintWriter(client.getOutputStream(), true)) {
                        
                        String request = in.readLine();
                        if (request != null && request.contains("SETTLE")) {
                            Log.i(TAG, "Settlement Received: " + request);
                            out.println("HTTP/1.1 200 OK");
                            out.println("Content-Type: application/json");
                            out.println();
                            out.println("{\"status\":\"SETTLED\", \"code\":\"00\"}");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Client handling error", e);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Server error", e);
            }
        });
    }

    public void stop() {
        isRunning = false;
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
