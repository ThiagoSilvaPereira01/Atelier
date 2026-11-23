package com.atelier.raquel;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String ALLOWED_PREFIX_GITHUB =
        "https://github.com/ThiagoSilvaPereira01/Atelier/";
    private static final String ALLOWED_PREFIX_OBJECTS =
        "https://objects.githubusercontent.com/";
    private static final String ALLOWED_PREFIX_RELEASE_ASSETS =
        "https://release-assets.githubusercontent.com/";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url", "");
        if (downloadUrl == null || !isTrustedUrl(downloadUrl)) {
            call.reject("URL de atualização inválida.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Context context = getContext();
                File apkFile = new File(context.getCacheDir(), "atelier-update.apk");
                if (apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }

                conn = openFollowingRedirects(downloadUrl, 5);
                int status = conn.getResponseCode();
                if (status < 200 || status >= 300) {
                    call.reject("Falha ao baixar atualização (HTTP " + status + ").");
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                long downloaded = 0;
                int lastReportedPercent = -1;

                try (
                    InputStream in = conn.getInputStream();
                    FileOutputStream out = new FileOutputStream(apkFile)
                ) {
                    byte[] buffer = new byte[16 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        downloaded += read;
                        if (totalBytes > 0) {
                            int percent = (int) Math.min(100, (downloaded * 100L) / totalBytes);
                            if (percent != lastReportedPercent) {
                                lastReportedPercent = percent;
                                emitProgress(percent);
                            }
                        }
                    }
                    out.flush();
                }

                emitProgress(100);

                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK
                );
                context.startActivity(installIntent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Erro ao baixar/instalar atualização: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    private void emitProgress(int percent) {
        JSObject payload = new JSObject();
        payload.put("percent", percent);
        notifyListeners("downloadProgress", payload);
    }

    private static boolean isTrustedUrl(String url) {
        return (
            url.startsWith(ALLOWED_PREFIX_GITHUB) ||
            url.startsWith(ALLOWED_PREFIX_OBJECTS) ||
            url.startsWith(ALLOWED_PREFIX_RELEASE_ASSETS)
        );
    }

    private static HttpURLConnection openFollowingRedirects(String initialUrl, int maxRedirects)
        throws Exception {
        String currentUrl = initialUrl;
        for (int i = 0; i <= maxRedirects; i++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(currentUrl).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("User-Agent", "Atelier-Android-Updater");

            int code = conn.getResponseCode();
            if (
                code == HttpURLConnection.HTTP_MOVED_TEMP ||
                code == HttpURLConnection.HTTP_MOVED_PERM ||
                code == HttpURLConnection.HTTP_SEE_OTHER ||
                code == 307 ||
                code == 308
            ) {
                String nextUrl = conn.getHeaderField("Location");
                conn.disconnect();
                if (nextUrl == null || nextUrl.isEmpty() || !nextUrl.startsWith("https://")) {
                    throw new IllegalStateException("Redirecionamento inválido");
                }
                currentUrl = nextUrl;
            } else {
                return conn;
            }
        }
        throw new IllegalStateException("Muitos redirecionamentos");
    }
}
