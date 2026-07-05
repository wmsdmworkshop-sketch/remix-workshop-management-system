package com.example.wmsworkshop.ui.main

import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.navigation3.runtime.NavKey
import java.io.File

@Composable
fun MainScreen(
  onItemClick: (NavKey) -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  var webView: WebView? by remember { mutableStateOf(null) }
  var uploadMessage: ValueCallback<Array<Uri>>? by remember { mutableStateOf(null) }
  var cameraImageUri: Uri? by remember { mutableStateOf(null) }

  // Launcher for file uploads (Camera capture or photo chooser)
  val fileChooserLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartActivityForResult()
  ) { result ->
    val data = result.data
    var uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)

    // Fallback to camera image if parseResult returned null but capture was successful
    if (uris == null && result.resultCode == android.app.Activity.RESULT_OK) {
      val lastSegment = cameraImageUri?.lastPathSegment
      if (lastSegment != null) {
        val file = File(context.cacheDir, lastSegment)
        if (file.exists() && file.length() > 0) {
          uris = arrayOf(cameraImageUri!!)
        }
      }
    }

    uploadMessage?.onReceiveValue(uris)
    uploadMessage = null
  }

  // Request location & camera permissions at startup
  val requestPermissionsLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestMultiplePermissions()
  ) { permissions ->
    // Perms granted
  }

  LaunchedEffect(Unit) {
    requestPermissionsLauncher.launch(
      arrayOf(
        android.Manifest.permission.CAMERA,
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.ACCESS_COARSE_LOCATION
      )
    )
  }

  BackHandler(enabled = webView?.canGoBack() == true) {
    webView?.goBack()
  }

  AndroidView(
    factory = { ctx ->
      WebView(ctx).apply {
        layoutParams = ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT
        )
        
        webViewClient = object : WebViewClient() {
          override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            return false
          }
        }

        webChromeClient = object : WebChromeClient() {
          // Grant permissions request from WebView
          override fun onPermissionRequest(request: PermissionRequest?) {
            request?.grant(request.resources)
          }

          // Grant Geolocation permissions request from WebView
          override fun onGeolocationPermissionsShowPrompt(
            origin: String?,
            callback: android.webkit.GeolocationPermissions.Callback?
          ) {
            callback?.invoke(origin, true, false)
          }

          // Handle input type="file" clicks with both Camera and Gallery support
          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            uploadMessage?.onReceiveValue(null)
            uploadMessage = filePathCallback
            
            // Create target file in cache directory
            val photoFile = File(context.cacheDir, "camera_photo_${System.currentTimeMillis()}.jpg")
            val authority = "com.example.wmsworkshop.fileprovider"
            val photoUri = FileProvider.getUriForFile(context, authority, photoFile)
            cameraImageUri = photoUri

            // Create Camera Capture Intent
            val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
              putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            }

            // Create Content Selection Intent
            val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
              addCategory(Intent.CATEGORY_OPENABLE)
              type = "image/*"
            }

            // Create Chooser Intent
            val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
              putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
              putExtra(Intent.EXTRA_TITLE, "Upload or Capture Photo")
              putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
            }

            try {
              fileChooserLauncher.launch(chooserIntent)
            } catch (e: Exception) {
              uploadMessage = null
              return false
            }
            return true
          }
        }
        
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.setGeolocationEnabled(true)
        settings.setAllowFileAccess(true)
        
        loadUrl("https://wms-workshop-app-production.up.railway.app/portal")
        webView = this
      }
    },
    modifier = modifier.fillMaxSize()
  )
}
