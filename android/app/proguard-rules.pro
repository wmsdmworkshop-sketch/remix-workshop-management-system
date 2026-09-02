# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# =====================================================================
# Capacitor / Cordova WebView bridge
# ---------------------------------------------------------------------
# Capacitor discovers and invokes its plugins by REFLECTION (annotated
# classes + @PluginMethod). R8 must not rename or strip them, or the app
# crashes on launch / the camera + attendance features stop working.
# =====================================================================
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

# Cordova plugins bridged through capacitor-cordova-android-plugins
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# Bundled Capacitor plugins (Camera, etc.)
-keep class com.capacitorjs.plugins.** { *; }

# WebView JavaScript interfaces
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Reflection safety: keep signatures, annotations, and inner-class metadata
-keepattributes *Annotation*
-keepattributes Signature,InnerClasses,EnclosingMethod

# Silence warnings for the bridged frameworks
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# Keep line numbers for readable production stack traces, hide source names
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
