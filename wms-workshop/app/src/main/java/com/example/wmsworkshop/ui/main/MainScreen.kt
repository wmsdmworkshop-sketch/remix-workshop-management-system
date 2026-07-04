package com.example.wmsworkshop.ui.main

import android.net.Uri
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation3.runtime.NavKey

@Composable
fun MainScreen(
  onItemClick: (NavKey) -> Unit,
  modifier: Modifier = Modifier
) {
  var webView: WebView? by remember { mutableStateOf(null) }
  var uploadMessage: ValueCallback<Array<Uri>>? by remember { mutableStateOf(null) }

  // Launcher for file uploads (Camera capture or photo chooser)
  val fileChooserLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartActivityForResult()
  ) { result ->
    val data = result.data
    val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
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
    factory = { context ->
      WebView(context).apply {
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

          // Handle input type="file" clicks
          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            uploadMessage?.onReceiveValue(null)
            uploadMessage = filePathCallback
            
            val intent = fileChooserParams?.createIntent()
            if (intent != null) {
              try {
                fileChooserLauncher.launch(intent)
              } catch (e: Exception) {
                uploadMessage = null
                return false
              }
            }
            return true
          }
        }
        
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        
        loadUrl("https://wms-workshop-app-production.up.railway.app/")
        webView = this
      }
    },
    modifier = modifier.fillMaxSize()
  )
}
