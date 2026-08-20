package com.aivaahan.dwip;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DWIP.MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Harden the WebView against OOM kills triggered by the native camera.
        // On low-RAM Xiaomi/MIUI devices (e.g. 2508CRN2BI ~400MB available),
        // launching com.android.camera causes lowmemorykiller to terminate DWIP,
        // producing a blank white screen on return. Reducing the WebView's memory
        // footprint lowers the OOM risk.
        try {
            WebView webView = getBridge().getWebView();

            // Switch to software rendering on low-RAM devices.
            // Hardware acceleration keeps a GPU tile cache that adds ~50-80MB of
            // native memory pressure — exactly what triggers the OOM kill.
            long maxMemMb = Runtime.getRuntime().maxMemory() / 1024 / 1024;
            if (maxMemMb < 256) {
                webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
                Log.w(TAG, "Low-RAM device (" + maxMemMb + "MB). Switched WebView to software rendering.");
            } else {
                Log.d(TAG, "WebView hardening applied. Max heap: " + maxMemMb + "MB");
            }
        } catch (Exception e) {
            Log.e(TAG, "WebView hardening failed: " + e.getMessage());
        }
    }
}
