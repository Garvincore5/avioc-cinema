package com.avioc.cinema;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Media3Player")
public class Media3PlayerPlugin extends Plugin {
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("A video stream URL is required.");
            return;
        }
        Intent intent = new Intent(getContext(), Media3PlayerActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("title", call.getString("title", "Avioc Cinema"));
        intent.putExtra("queueJson", call.getString("queueJson", "[]"));
        intent.putExtra("startPosition", call.getLong("startPosition", 0L));
        intent.putExtra("previewSeconds", call.getInt("previewSeconds", 0));
        startActivityForResult(call, intent, "onPlaybackFinished");
    }

    @ActivityCallback
    private void onPlaybackFinished(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        JSObject response = new JSObject();
        if (data != null) {
            response.put("position", data.getLongExtra("position", 0L));
            response.put("queueIndex", data.getIntExtra("queueIndex", 0));
            response.put("previewExpired", data.getBooleanExtra("previewExpired", false));
        }
        call.resolve(response);
    }
}
