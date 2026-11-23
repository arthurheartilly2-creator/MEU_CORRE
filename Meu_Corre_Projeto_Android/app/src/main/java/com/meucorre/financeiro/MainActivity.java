package com.meucorre.financeiro;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.Locale;

public final class MainActivity extends Activity {
    // A página é carregada de arquivos internos, nunca de um servidor externo.
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://appassets.androidplatform.net/assets/";
    private static final int PICK_BACKUP = 551;
    private static final int SAVE_BACKUP = 552;

    private WebView browser;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String pendingBackup;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        browser = new WebView(this);
        setContentView(browser);
        browser.setBackgroundColor(0xfff6f8fa);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        browser.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                String scheme = uri.getScheme();
                String path = uri.getPath();
                if (!"https".equals(scheme) || !HOST.equals(host) || path == null || !path.startsWith("/assets/")) {
                    return blocked();
                }
                String assetName = path.substring("/assets/".length());
                if (assetName.isEmpty() || assetName.contains("..") || assetName.contains("/") || assetName.contains("\\")) {
                    return blocked();
                }
                try {
                    InputStream content = getAssets().open(assetName);
                    String mime = "application/octet-stream";
                    if (assetName.endsWith(".html")) mime = "text/html";
                    else if (assetName.endsWith(".js")) mime = "application/javascript";
                    else if (assetName.endsWith(".css")) mime = "text/css";
                    else if (assetName.endsWith(".png")) mime = "image/png";
                    else if (assetName.endsWith(".webmanifest")) mime = "application/manifest+json";
                    return new WebResourceResponse(mime, "UTF-8", content);
                } catch (Exception ignored) {
                    return blocked();
                }
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost());
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(intent, PICK_BACKUP);
                    return true;
                } catch (Exception e) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });
        // Somente os recursos locais do próprio aplicativo são carregados.
        browser.addJavascriptInterface(new BackupBridge(), "MeuCorreAndroid");
        browser.loadUrl(BASE + "index.html");
    }

    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private final class BackupBridge {
        @JavascriptInterface
        public void exportBackup(String json) {
            if (json == null || json.length() > 2_000_000) return;
            runOnUiThread(() -> {
                pendingBackup = json;
                try {
                    String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, "meu-corre-backup-" + date + ".json");
                    startActivityForResult(intent, SAVE_BACKUP);
                } catch (Exception e) {
                    pendingBackup = null;
                    Toast.makeText(MainActivity.this, "Não foi possível abrir o salvamento.", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        super.onActivityResult(requestCode, resultCode, intent);
        if (requestCode == PICK_BACKUP) {
            if (fileChooserCallback != null) {
                Uri uri = (resultCode == RESULT_OK && intent != null) ? intent.getData() : null;
                fileChooserCallback.onReceiveValue(uri != null ? new Uri[]{uri} : null);
                fileChooserCallback = null;
            }
        } else if (requestCode == SAVE_BACKUP) {
            if (resultCode == RESULT_OK && intent != null && intent.getData() != null && pendingBackup != null) {
                try (OutputStream output = getContentResolver().openOutputStream(intent.getData())) {
                    if (output == null) throw new Exception("Arquivo inacessível");
                    output.write(pendingBackup.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Backup salvo com sucesso.", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Falha ao salvar o backup.", Toast.LENGTH_LONG).show();
                }
            }
            pendingBackup = null;
        }
    }

    @Override
    protected void onDestroy() {
        if (browser != null) browser.destroy();
        super.onDestroy();
    }
}
