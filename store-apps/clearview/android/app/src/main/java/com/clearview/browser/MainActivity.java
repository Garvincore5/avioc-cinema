package com.clearview.browser;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.os.Message;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.yausername.ffmpeg.FFmpeg;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import kotlin.Unit;
import kotlin.jvm.functions.Function3;

public class MainActivity extends Activity {
    private static final String PREFS = "clearview";
    private static final String FAVS = "favorites";
    private static final int DARK = Color.rgb(17, 21, 28);
    private static final int LIGHT = Color.rgb(233, 237, 244);
    private static final int GREEN = Color.rgb(196, 242, 121);
    private static final Set<String> BLOCKED = new HashSet<>(Arrays.asList(
            "doubleclick.net", "googlesyndication.com", "googleadservices.com", "googletagservices.com",
            "adnxs.com", "adsrvr.org", "adform.net", "taboola.com", "outbrain.com", "criteo.com",
            "scorecardresearch.com", "adroll.com", "moatads.com", "amazon-adsystem.com", "rubiconproject.com",
            "pubmatic.com", "openx.net", "casalemedia.com", "lijit.com", "sharethrough.com", "smartadserver.com",
            "serving-sys.com", "advertising.com", "adsafeprotected.com", "agkn.com", "bidswitch.net",
            "bluekai.com", "contextweb.com", "pushengage.com", "pushnami.com", "propellerads.com",
            "popads.net", "popcash.net", "exoclick.com", "juicyads.com", "trafficjunky.net", "clickadu.com",
            "hilltopads.net", "onclickads.net", "adsterra.com", "monetag.com"));

    private WebView web;
    private EditText address;
    private TextView status;
    private Button favoriteButton;
    private ProgressBar progress;
    private volatile boolean downloading;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(DARK);
        getWindow().setNavigationBarColor(DARK);
        getWindow().getDecorView().setSystemUiVisibility(0);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(DARK);

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(7), dp(8), dp(7));
        bar.setBackgroundColor(DARK);
        Button back = button("‹"); back.setOnClickListener(v -> { if (web.canGoBack()) web.goBack(); });
        Button forward = button("›"); forward.setOnClickListener(v -> { if (web.canGoForward()) web.goForward(); });
        Button reload = button("↻"); reload.setOnClickListener(v -> web.reload());
        address = new EditText(this);
        address.setSingleLine(true);
        address.setTextColor(LIGHT);
        address.setHintTextColor(Color.GRAY);
        address.setHint("Search or enter a website");
        address.setTextSize(14);
        address.setPadding(dp(10), 0, dp(10), 0);
        address.setBackgroundColor(Color.rgb(31, 38, 48));
        address.setImeOptions(EditorInfo.IME_ACTION_GO);
        address.setOnEditorActionListener((v, action, event) -> { if (action == EditorInfo.IME_ACTION_GO) { navigate(address.getText().toString()); return true; } return false; });
        LinearLayout.LayoutParams addressParams = new LinearLayout.LayoutParams(0, dp(44), 1f);
        addressParams.setMargins(dp(4), 0, dp(4), 0);
        favoriteButton = button("☆");
        favoriteButton.setOnClickListener(v -> toggleFavorite());
        Button favorites = button("★"); favorites.setOnClickListener(v -> showFavorites());
        bar.addView(back); bar.addView(forward); bar.addView(reload); bar.addView(address, addressParams); bar.addView(favoriteButton); bar.addView(favorites);
        root.addView(bar);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100); progress.setProgressTintList(android.content.res.ColorStateList.valueOf(GREEN));
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));

        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (uri.getHost() != null && isBlocked(uri.getHost())) return true;
                if (uri.getHost() != null && isAuthHost(uri.getHost())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                    return true;
                }
                if (uri.getScheme() != null && !uri.getScheme().equals("http") && !uri.getScheme().equals("https")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) { address.setText(url); refreshFavorite(); }
            @Override public void onPageFinished(WebView view, String url) { address.setText(url); refreshFavorite(); }
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.getHost() != null && isBlocked(uri.getHost())) return new android.webkit.WebResourceResponse("text/plain", "utf-8", null);
                return super.shouldInterceptRequest(view, request);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE); }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, Message resultMsg) {
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView popupView, WebResourceRequest request) {
                        Uri target = request.getUrl();
                        if (target.getHost() != null && isAuthHost(target.getHost())) {
                            try { startActivity(new Intent(Intent.ACTION_VIEW, target)); } catch (Exception ignored) {}
                        } else if (target.getHost() == null || !isBlocked(target.getHost())) {
                            navigate(target.toString());
                        }
                        popupView.destroy();
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(dp(8), dp(4), dp(8), dp(4));
        actions.setBackgroundColor(DARK);
        Button download = button("↓ Download video"); download.setTextColor(Color.rgb(24, 34, 11)); download.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));
        download.setOnClickListener(v -> downloadCurrent());
        status = new TextView(this); status.setTextColor(Color.LTGRAY); status.setTextSize(12); status.setPadding(dp(8), 0, dp(4), 0);
        actions.addView(download);
        actions.addView(status, new LinearLayout.LayoutParams(0, dp(44), 1f));
        root.addView(actions);
        setContentView(root);
        if (state != null) web.restoreState(state); else web.loadUrl("https://www.google.com");
        status.setText("Ad filtering on");
        new Thread(() -> { try { YoutubeDL.getInstance().init(this); FFmpeg.getInstance().init(this); } catch (Exception e) { runOnUiThread(() -> status.setText("Downloader setup failed")); } }).start();
    }

    private boolean isBlocked(String rawHost) {
        String host = rawHost.toLowerCase(Locale.ROOT);
        for (String domain : BLOCKED) if (host.equals(domain) || host.endsWith("." + domain)) return true;
        return false;
    }

    private boolean isAuthHost(String rawHost) {
        String host = rawHost.toLowerCase(Locale.ROOT);
        return host.equals("accounts.google.com") || host.equals("appleid.apple.com")
                || host.equals("login.microsoftonline.com") || host.equals("login.live.com");
    }

    private void navigate(String input) {
        String value = input.trim();
        if (value.isEmpty()) return;
        if (!value.contains(" ") && value.matches("(?i)^(https?://)?[\\w.-]+\\.[a-z]{2,}([/:?#].*)?$")) {
            if (!value.matches("(?i)^https?://.*")) value = "https://" + value;
        } else if (!value.matches("(?i)^https?://.*")) value = "https://www.google.com/search?q=" + Uri.encode(value);
        web.loadUrl(value);
    }

    private void toggleFavorite() {
        String url = web.getUrl();
        if (url == null || !url.startsWith("http")) return;
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> saved = new HashSet<>(prefs.getStringSet(FAVS, new HashSet<>()));
        if (!saved.remove(url)) saved.add(url);
        prefs.edit().putStringSet(FAVS, saved).apply();
        refreshFavorite();
    }

    private void refreshFavorite() {
        String url = web == null ? null : web.getUrl();
        Set<String> saved = getSharedPreferences(PREFS, MODE_PRIVATE).getStringSet(FAVS, new HashSet<>());
        favoriteButton.setText(url != null && saved.contains(url) ? "★" : "☆");
    }

    private void showFavorites() {
        Set<String> saved = getSharedPreferences(PREFS, MODE_PRIVATE).getStringSet(FAVS, new HashSet<>());
        List<String> urls = new ArrayList<>(saved);
        if (urls.isEmpty()) { Toast.makeText(this, "No favorites saved yet", Toast.LENGTH_SHORT).show(); return; }
        new android.app.AlertDialog.Builder(this).setTitle("Favorites").setItems(urls.toArray(new String[0]), (dialog, which) -> navigate(urls.get(which))).setNegativeButton("Close", null).show();
    }

    private void downloadCurrent() {
        if (downloading) return;
        final String url = web.getUrl();
        if (url == null || !url.startsWith("http")) return;
        downloading = true;
        status.setText("Starting download…");
        new Thread(() -> {
            try {
                File staging = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "staging");
                if (!staging.exists()) staging.mkdirs();
                File[] previous = staging.listFiles();
                if (previous != null) for (File file : previous) deleteRecursively(file);
                YoutubeDLRequest request = new YoutubeDLRequest(url);
                request.addOption("--no-playlist"); request.addOption("--newline"); request.addOption("--no-mtime");
                request.addOption("-o", new File(staging, "%(title).180B [%(id)s].%(ext)s").getAbsolutePath());
                Function3<Float, Long, String, Unit> callback = (percent, eta, line) -> {
                    runOnUiThread(() -> status.setText(line == null ? "Downloading…" : line));
                    return Unit.INSTANCE;
                };
                YoutubeDL.getInstance().execute(request, "clearview-" + System.currentTimeMillis(), callback);
                File[] files = staging.listFiles();
                if (files != null) for (File file : files) {
                    if (file.isFile() && file.length() > 65536) publishDownload(file);
                }
                runOnUiThread(() -> status.setText("Download finished"));
            } catch (Exception e) { runOnUiThread(() -> status.setText("Download failed: " + e.getMessage())); }
            finally { downloading = false; }
        }).start();
    }

    private void publishDownload(File source) throws Exception {
        android.content.ContentValues values = new android.content.ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, source.getName());
        values.put(MediaStore.MediaColumns.MIME_TYPE, "video/*");
        if (android.os.Build.VERSION.SDK_INT >= 29) values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Clearview");
        Uri collection = android.os.Build.VERSION.SDK_INT >= 29 ? MediaStore.Downloads.EXTERNAL_CONTENT_URI : MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        Uri target = getContentResolver().insert(collection, values);
        if (target == null) throw new IllegalStateException("Could not save the video to Downloads");
        try (FileInputStream input = new FileInputStream(source); OutputStream output = getContentResolver().openOutputStream(target)) {
            if (output == null) throw new IllegalStateException("Could not open the Downloads folder");
            byte[] buffer = new byte[65536]; int count;
            while ((count = input.read(buffer)) >= 0) output.write(buffer, 0, count);
        }
        source.delete();
    }

    private void deleteRecursively(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        file.delete();
    }

    private Button button(String text) {
        Button b = new Button(this); b.setText(text); b.setTextColor(LIGHT); b.setTextSize(14); b.setMinWidth(dp(40));
        b.setPadding(dp(5), 0, dp(5), 0); b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(31, 38, 48)));
        return b;
    }
    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + 0.5f); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
