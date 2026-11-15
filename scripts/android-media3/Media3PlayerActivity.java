package com.avioc.cinema;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;
import org.json.JSONArray;
import org.json.JSONObject;

public class Media3PlayerActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ExoPlayer player;
    private JSONArray queue;
    private TextView titleView;
    private int queueIndex = 0;
    private int previewSeconds = 0;
    private int playedSeconds = 0;
    private boolean previewExpired = false;
    private boolean resultSent = false;

    private final Runnable previewClock = new Runnable() {
        @Override public void run() {
            if (player != null && player.isPlaying() && previewSeconds > 0) {
                playedSeconds++;
                if (playedSeconds >= previewSeconds) {
                    previewExpired = true;
                    finish();
                    return;
                }
            }
            handler.postDelayed(this, 1000);
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        String rawQueue = getIntent().getStringExtra("queueJson");
        try { queue = new JSONArray(rawQueue == null ? "[]" : rawQueue); }
        catch (Exception ignored) { queue = new JSONArray(); }
        previewSeconds = getIntent().getIntExtra("previewSeconds", 0);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.BLACK);
        titleView = new TextView(this);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(18);
        titleView.setGravity(Gravity.CENTER_VERTICAL);
        titleView.setPadding(dp(18), 0, dp(12), 0);
        titleView.setSingleLine(true);
        root.addView(titleView, new LinearLayout.LayoutParams(-1, dp(52)));

        PlayerView playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setControllerShowTimeoutMs(6000);
        root.addView(playerView, new LinearLayout.LayoutParams(-1, 0, 1));

        if (queue.length() > 1) {
            HorizontalScrollView scroll = new HorizontalScrollView(this);
            scroll.setHorizontalScrollBarEnabled(false);
            LinearLayout dock = new LinearLayout(this);
            dock.setOrientation(LinearLayout.HORIZONTAL);
            dock.setPadding(dp(8), dp(5), dp(8), dp(5));
            for (int i = 0; i < queue.length(); i++) {
                final int selected = i;
                JSONObject item = queue.optJSONObject(i);
                String itemTitle = item == null ? "Video " + (i + 1) : item.optString("title", "Video " + (i + 1));
                Button button = new Button(this);
                button.setText(itemTitle);
                button.setTextColor(Color.WHITE);
                button.setAllCaps(false);
                button.setOnClickListener(v -> playQueueItem(selected, 0));
                dock.addView(button, new LinearLayout.LayoutParams(-2, dp(46)));
            }
            scroll.addView(dock);
            root.addView(scroll, new LinearLayout.LayoutParams(-1, dp(58)));
        }

        setContentView(root);
        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override public void onMediaItemTransition(MediaItem item, int reason) {
                queueIndex = Math.max(0, player.getCurrentMediaItemIndex());
                JSONObject selected = queue.optJSONObject(queueIndex);
                if (selected != null) titleView.setText(selected.optString("title", "Avioc Cinema"));
            }
        });
        String initialUrl = getIntent().getStringExtra("url");
        String initialTitle = getIntent().getStringExtra("title");
        titleView.setText(initialTitle == null ? "Avioc Cinema" : initialTitle);
        int initialIndex = findQueueItem(initialUrl);
        playQueueItem(initialIndex, getIntent().getLongExtra("startPosition", 0L));
        handler.postDelayed(previewClock, 1000);
    }

    private int findQueueItem(String url) {
        if (url == null) return 0;
        for (int i = 0; i < queue.length(); i++) {
            JSONObject item = queue.optJSONObject(i);
            if (item != null && url.equals(item.optString("url"))) return i;
        }
        return 0;
    }

    private void playQueueItem(int index, long position) {
        queueIndex = Math.max(0, Math.min(index, Math.max(0, queue.length() - 1)));
        JSONObject item = queue.optJSONObject(queueIndex);
        String url = item == null ? getIntent().getStringExtra("url") : item.optString("url", getIntent().getStringExtra("url"));
        String title = item == null ? getIntent().getStringExtra("title") : item.optString("title", "Avioc Cinema");
        titleView.setText(title == null ? "Avioc Cinema" : title);
        if (url == null || player == null) return;
        player.setMediaItem(MediaItem.fromUri(url));
        player.prepare();
        if (position > 0) player.seekTo(position);
        player.play();
    }

    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + 0.5f); }

    @Override public void finish() {
        if (!resultSent) {
            resultSent = true;
            android.content.Intent data = new android.content.Intent();
            data.putExtra("position", player == null ? 0L : player.getCurrentPosition());
            data.putExtra("queueIndex", queueIndex);
            data.putExtra("previewExpired", previewExpired);
            setResult(Activity.RESULT_OK, data);
        }
        super.finish();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacks(previewClock);
        if (player != null) { player.release(); player = null; }
        super.onDestroy();
    }
}
