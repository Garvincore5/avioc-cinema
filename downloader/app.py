"""
VIDOR - Universal Video & Audio Downloader Web Application
Flask Server & REST API.
"""

import os
import re
import sys
import shutil
import subprocess
from flask import Flask, render_template, request, jsonify, send_file, Response
from downloader_engine import (
    engine, 
    get_library_files, 
    get_search_suggestions,
    EXPLORE_CATEGORIES,
    DOWNLOADS_DIR,
    VIDEOS_DIR, 
    AUDIO_DIR, 
    FFMPEG_PATH,
    format_bytes,
    get_user_search_history,
    save_user_search,
    clear_user_search_history,
    get_saved_playlists,
    save_user_playlist,
    delete_user_playlist
)
import requests
import yt_dlp

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Range'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Simple health probe so the Avioc Cinema app can detect the local Vidor engine."""
    return jsonify({"status": "ok", "engine": "vidor", "version": "1.0"})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Returns system capabilities, FFmpeg presence, and free disk space."""
    total, used, free = shutil.disk_usage(VIDEOS_DIR)
    return jsonify({
        "status": "ready",
        "ytdlp_version": yt_dlp.version.__version__,
        "ffmpeg_detected": FFMPEG_PATH is not None,
        "ffmpeg_path": FFMPEG_PATH or "Not found (Standard 720p available, high-res audio merging needs FFmpeg)",
        "disk_free": format_bytes(free),
        "disk_total": format_bytes(total),
        "videos_dir": VIDEOS_DIR,
        "audio_dir": AUDIO_DIR
    })

@app.route('/api/suggest', methods=['GET'])
def get_suggestions():
    """Returns instant search suggestions as user types."""
    query = request.args.get('q', '').strip()
    suggestions = get_search_suggestions(query)
    return jsonify({"query": query, "suggestions": suggestions})

@app.route('/api/explore/categories', methods=['GET'])
def get_explore_categories():
    """Returns all available explore/browse categories."""
    cats = []
    for k, v in EXPLORE_CATEGORIES.items():
        cats.append({
            "key": k,
            "name": v['name'],
            "icon": v['icon'],
            "description": v['description']
        })
    return jsonify({"categories": cats})

@app.route('/api/explore/<category>', methods=['GET'])
def get_explore(category):
    """Returns live explore / discovery feed for the given category."""
    feed = engine.get_explore_feed(category)
    return jsonify(feed)

@app.errorhandler(Exception)
def handle_global_exception(e):
    """Ensures all server errors return pure JSON, never HTML."""
    code = getattr(e, 'code', 500)
    return jsonify({"error": str(e)}), code

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyzes a URL or search query and returns video info with format options."""
    try:
        data = request.get_json(silent=True) or {}
        query_or_url = str(data.get('url') or '').strip()
        if not query_or_url:
            return jsonify({"error": "Please provide a valid URL or search term."}), 400

        result = engine.analyze(query_or_url)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/download', methods=['POST'])
def download():
    """Starts downloading media with selected format and quality."""
    try:
        data = request.get_json(silent=True) or {}
        url = str(data.get('url') or '').strip()
        format_id = str(data.get('format_id') or 'best')
        quality_label = str(data.get('quality') or 'Best')
        media_type = str(data.get('media_type') or 'video')
        title = str(data.get('title') or '')
        uploader = str(data.get('uploader') or '')
        thumbnail = str(data.get('thumbnail') or '')

        if not url:
            return jsonify({"error": "Missing download URL"}), 400

        task = engine.start_download(
            url=url,
            format_id=format_id,
            quality_label=quality_label,
            media_type=media_type,
            title=title,
            uploader=uploader,
            thumbnail=thumbnail
        )
        return jsonify({
            "success": True,
            "task_id": task.id,
            "task": task.to_dict()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/download', methods=['GET'])
def download_stream():
    """Streams a YouTube/URL download directly to the browser as a file download.
    Used by the Avioc Cinema Save button when the local Vidor engine is running.
    Query params: url, quality, type (audio|video), title
    """
    import tempfile, threading
    url = request.args.get('url', '').strip()
    media_type = request.args.get('type', 'video')
    quality = request.args.get('quality', 'best')
    title = request.args.get('title', 'download')

    if not url:
        return jsonify({"error": "Missing url parameter"}), 400

    ext = 'mp3' if media_type == 'audio' else 'mp4'
    safe_title = "".join(c for c in title if c.isalnum() or c in ' _-').strip() or 'download'
    filename = f"{safe_title}.{ext}"

    # Use yt-dlp to stream directly into response
    import io
    buf = io.BytesIO()
    ydl_opts = {
        'format': 'bestaudio/best' if media_type == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True,
        'outtmpl': '-',  # stdout
    }

    # Download to temp file then stream it
    tmp = tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        ydl_opts['outtmpl'] = tmp_path
        if media_type == 'audio':
            ydl_opts['postprocessors'] = [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3'}]
            ydl_opts['outtmpl'] = tmp_path.replace(f'.{ext}', '')

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find the actual output file (yt-dlp may have changed extension)
        actual_path = tmp_path
        for candidate in [tmp_path, tmp_path.replace(f'.{ext}', f'.{ext}'), tmp_path + f'.{ext}']:
            if os.path.exists(candidate):
                actual_path = candidate
                break

        def generate():
            with open(actual_path, 'rb') as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    yield chunk
            try:
                os.unlink(actual_path)
            except Exception:
                pass

        mime = 'audio/mpeg' if media_type == 'audio' else 'video/mp4'
        from flask import Response, stream_with_context
        return Response(
            stream_with_context(generate()),
            mimetype=mime,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Access-Control-Allow-Origin': '*'
            }
        )
    except Exception as e:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500

@app.route('/api/downloads', methods=['GET'])
def get_downloads():
    """Returns all queued, active, and completed download tasks."""
    return jsonify({"tasks": engine.get_all_tasks()})

@app.route('/api/download/<task_id>/cancel', methods=['POST'])
def cancel_download(task_id):
    """Cancels an in-progress download."""
    success = engine.cancel_task(task_id)
    return jsonify({"success": success})

@app.route('/api/download/<task_id>/clear', methods=['POST'])
def clear_download(task_id):
    """Removes a task from the downloads list."""
    success = engine.clear_task(task_id)
    return jsonify({"success": success})

@app.route('/api/library', methods=['GET'])
def get_library():
    """Returns all downloaded videos and audio files."""
    files = get_library_files()
    return jsonify({"files": files})

@app.route('/api/library/<media_type>/<path:filename>', methods=['DELETE'])
def delete_library_file(media_type, filename):
    """Deletes a file from the download library."""
    target_dir = AUDIO_DIR if media_type == "audio" else VIDEOS_DIR
    filepath = os.path.join(target_dir, filename)

    # Security check: prevent directory traversal
    if not os.path.abspath(filepath).startswith(os.path.abspath(target_dir)):
        return jsonify({"error": "Invalid file path"}), 403

    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "File not found"}), 404

@app.route('/api/library/open-folder', methods=['POST'])
def open_folder():
    """Opens the downloads directory in Windows File Explorer."""
    data = request.get_json() or {}
    folder_type = data.get("type", "all")
    
    target_dir = DOWNLOADS_DIR
    if folder_type == "video":
        target_dir = VIDEOS_DIR
    elif folder_type == "audio":
        target_dir = AUDIO_DIR

    try:
        if sys.platform == 'win32':
            os.startfile(target_dir)
        elif sys.platform == 'darwin':
            subprocess.run(['open', target_dir])
        else:
            subprocess.run(['xdg-open', target_dir])
        return jsonify({"success": True, "path": target_dir})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Returns stored search history."""
    history = get_user_search_history()
    return jsonify({"history": history})

@app.route('/api/history', methods=['POST'])
def add_history():
    """Adds a query to search history."""
    data = request.get_json(silent=True) or {}
    query = str(data.get('query') or '').strip()
    history = save_user_search(query)
    return jsonify({"success": True, "history": history})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    """Clears all stored search history."""
    success = clear_user_search_history()
    return jsonify({"success": success})

@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    """Returns all saved playlists."""
    playlists = get_saved_playlists()
    return jsonify({"playlists": playlists})

@app.route('/api/playlists', methods=['POST'])
def add_playlist():
    """Saves or updates a playlist."""
    data = request.get_json(silent=True) or {}
    name = str(data.get('name') or 'My Playlist').strip()
    items = data.get('items') or []
    playlists = save_user_playlist(name, items)
    return jsonify({"success": True, "playlists": playlists})

@app.route('/api/playlists/<playlist_id>', methods=['DELETE'])
def remove_playlist(playlist_id):
    """Deletes a saved playlist."""
    playlists = delete_user_playlist(playlist_id)
    return jsonify({"success": True, "playlists": playlists})

@app.route('/api/proxy')
def proxy_browser():
    """Smart web proxy for in-app browser to bypass X-Frame-Options & CSP frame restrictions."""
    target_url = request.args.get('url', '').strip()
    if not target_url:
        return Response("<h2 style='color:#fff;font-family:sans-serif;'>No URL provided</h2>", status=400, content_type='text/html')
    
    if not target_url.startswith('http://') and not target_url.startswith('https://'):
        target_url = 'https://' + target_url

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
    }

    try:
        resp = requests.get(target_url, headers=headers, timeout=12, allow_redirects=True, stream=True)
        content_type = resp.headers.get('Content-Type', '')

        if 'text/html' in content_type:
            html = resp.text
            base_url = resp.url
            base_tag = f'<base href="{base_url}">'
            bridge_script = f"""
            <script>
            (function() {{
              try {{
                window.parent.postMessage({{ type: 'vidor_browser_url_changed', url: '{base_url}' }}, '*');
                document.addEventListener('click', function(e) {{
                  var link = e.target.closest('a');
                  if (link && link.href && !link.href.startsWith('javascript:')) {{
                    e.preventDefault();
                    window.parent.postMessage({{ type: 'vidor_browser_navigate', url: link.href }}, '*');
                  }}
                }}, true);
              }} catch(err) {{}}
            }})();
            </script>
            """
            if '<head>' in html:
                html = html.replace('<head>', f'<head>{base_tag}{bridge_script}', 1)
            elif '<head ' in html:
                head_idx = html.find('>')
                if head_idx != -1:
                    html = html[:head_idx+1] + f'{base_tag}{bridge_script}' + html[head_idx+1:]
            else:
                html = f'{base_tag}{bridge_script}' + html

            flask_resp = Response(html, status=resp.status_code, content_type='text/html; charset=utf-8')
        else:
            flask_resp = Response(resp.iter_content(chunk_size=16384), status=resp.status_code, content_type=content_type)

        for h in ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'strict-transport-security']:
            flask_resp.headers.pop(h, None)
            flask_resp.headers.pop(h.upper(), None)
        flask_resp.headers['Access-Control-Allow-Origin'] = '*'
        return flask_resp

    except Exception:
        friendly_page = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #0b0f19;
              color: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 85vh;
              margin: 0;
              padding: 24px;
            }}
            .portal-card {{
              background: #111728;
              border: 1px solid rgba(255, 51, 102, 0.35);
              border-radius: 18px;
              padding: 36px 28px;
              max-width: 540px;
              text-align: center;
              box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(255, 51, 102, 0.15);
            }}
            .icon {{ font-size: 42px; margin-bottom: 12px; }}
            h2 {{ font-size: 22px; color: #fff; margin: 0 0 10px; font-weight: 800; }}
            p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }}
            .target-pill {{
              background: #070a12;
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 10px 14px;
              border-radius: 10px;
              font-family: monospace;
              color: #00e5ff;
              font-size: 13px;
              word-break: break-all;
              margin-bottom: 24px;
            }}
            .actions {{ display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }}
            .btn-act {{
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 12px 20px;
              border-radius: 24px;
              font-weight: 700;
              font-size: 13px;
              text-decoration: none;
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }}
            .btn-primary {{
              background: linear-gradient(135deg, #ff3366, #ff6633);
              color: #fff;
              box-shadow: 0 4px 16px rgba(255, 51, 102, 0.4);
            }}
            .btn-secondary {{
              background: rgba(255, 255, 255, 0.08);
              color: #fff;
              border: 1px solid rgba(255, 255, 255, 0.18);
            }}
            .btn-act:hover {{ transform: translateY(-2px); opacity: 0.95; }}
          </style>
        </head>
        <body>
          <div class="portal-card">
            <div class="icon">🌐</div>
            <h2>Vidor In-App Browser</h2>
            <div class="target-pill">{target_url}</div>
            <p>This web service enforces authenticated local sessions or client-side isolation (e.g. WhatsApp Web QR sync). You can open it in a dedicated window or sniff all downloadable media right here!</p>
            <div class="actions">
              <a class="btn-act btn-primary" href="{target_url}" target="_blank" rel="noopener">
                🚀 Launch in Dedicated Window
              </a>
              <button class="btn-act btn-secondary" onclick="window.parent.vidorApp.analyzeAndOpenQuality('{target_url}')">
                ⚡ Sniff & Download Media
              </button>
            </div>
          </div>
        </body>
        </html>
        """
        return Response(friendly_page, status=200, content_type='text/html')

@app.route('/stream/<media_type>/<path:filename>')
@app.route('/api/stream/<media_type>/<path:filename>')
def stream_media(media_type, filename):
    """
    Streams video/audio files with full HTTP 206 Partial Content (Range) support.
    Enables instant seeking, scrub bar, and fast streaming playback in HTML5 media players.
    """
    target_dir = AUDIO_DIR if media_type == "audio" else VIDEOS_DIR
    filepath = os.path.join(target_dir, filename)

    if not os.path.exists(filepath):
        return "File not found", 404

    file_size = os.path.getsize(filepath)
    range_header = request.headers.get('Range', None)
    is_download = request.args.get('download') == '1' or 'download' in request.args

    # Determine MIME type
    ext = os.path.splitext(filename)[1].lower()
    mime_types = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac'
    }
    content_type = mime_types.get(ext, 'application/octet-stream')

    if not range_header:
        # Standard full file download / stream
        return send_file(filepath, mimetype=content_type, as_attachment=is_download, download_name=filename)

    # Parse byte range header (e.g. "bytes=0-1048575")
    byte1, byte2 = 0, None
    m = re.search(r'bytes=(\d+)-(\d*)', range_header)
    if m:
        g = m.groups()
        byte1 = int(g[0])
        if g[1]:
            byte2 = int(g[1])

    if byte2 is None:
        byte2 = file_size - 1

    length = byte2 - byte1 + 1

    def send_chunk(fpath, start, chunk_length):
        with open(fpath, 'rb') as f:
            f.seek(start)
            bytes_left = chunk_length
            while bytes_left > 0:
                chunk_size = min(bytes_left, 1024 * 64)
                data = f.read(chunk_size)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    resp = Response(
        send_chunk(filepath, byte1, length),
        206,
        mimetype=content_type,
        direct_passthrough=True
    )
    resp.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{file_size}')
    resp.headers.add('Accept-Ranges', 'bytes')
    resp.headers.add('Content-Length', str(length))
    return resp

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"==================================================")
    print(f"  VIDOR - UNIVERSAL MEDIA DOWNLOADER")
    print(f"  Live at: http://localhost:{port}")
    print(f"  Downloads Directory: {DOWNLOADS_DIR}")
    print(f"  FFmpeg: {'ENABLED' if FFMPEG_PATH else 'NOT DETECTED'}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
