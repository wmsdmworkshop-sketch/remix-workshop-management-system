package com.aivaahan.dwip;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * Main activity for the DWIP application.
 * This activity extends {@link BridgeActivity} to host the Capacitor-based web application.
 * It includes specific hardening measures for the WebView to prevent out-of-memory (OOM)
 * kills on low-RAM devices, particularly during resource-intensive operations like
 * using the native camera.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "DWIP.MainActivity";

    /**
     * Initializes the activity and applies WebView hardening configurations.
     * <p>
     * The hardening logic addresses OOM kills on low-RAM devices by:
     * <ul>
     *   <li>Setting higher renderer priority to survive backgrounding during camera usage.</li>
     *   <li>Disabling autofill to reduce memory overhead.</li>
     *   <li>Switching to software rendering on devices with less than 256MB of max heap memory.</li>
     * </ul>
     *
     * @param savedInstanceState If the activity is being re-initialized after
     *                           previously being shut down then this Bundle contains the data it most
     *                           recently supplied in {@link #onSaveInstanceState}. Note: Otherwise it is null.
     */
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

            // Tell Android to keep the WebView renderer alive at a higher
            // priority even when backgrounded (e.g., during native camera
            // capture). The 'false' parameter means don't bind the renderer
            // to the activity lifecycle — this lets it survive the camera
            // activity detour on mid/low-RAM devices.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setRendererPriorityPolicy(
                    WebView.RENDERER_PRIORITY_IMPORTANT, false);
                Log.d(TAG, "WebView renderer priority set to IMPORTANT (survives background).");
            }

            // Disable autofill to reduce WebView memory overhead — DWIP uses
            // its own auth system, not Android autofill.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(
                    View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }

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
