"""
VIDOR - Universal Video & Audio Downloader Engine
Powered by yt-dlp and FFmpeg.
Supports 1000+ platforms including YouTube, TikTok, Instagram, Facebook, Twitter, SoundCloud, etc.
"""

import os
import sys
import uuid
import time
import shutil
import threading
import subprocess
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, List, Optional
import yt_dlp

# Base directory for downloads
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
VIDEOS_DIR = os.path.join(DOWNLOADS_DIR, "videos")
AUDIO_DIR = os.path.join(DOWNLOADS_DIR, "audio")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

# Locate FFmpeg binary on Windows
def find_ffmpeg() -> Optional[str]:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    
    # Common Windows winget / install paths
    candidates = [
        r"C:\Users\user\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.EXE",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

FFMPEG_PATH = find_ffmpeg()

# Default browser headers to avoid 403 / bot detection
DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Mode': 'navigate',
}

# Multi-client fallback cascade for maximum YouTube compatibility without SABR or 403 errors
YOUTUBE_EXTRACTOR_ARGS = {
    'youtube': {
        'player_client': ['android_vr', 'tv_embedded', 'ios', 'android', 'mweb', 'web'],
    }
}

# Explore categories mapping for VidMate-style browsing
EXPLORE_CATEGORIES = {
    'music': {
        'name': 'African & Global Music Hits',
        'query': 'ytsearch40:top latest african music video 2025 2026 afrobeats amapiano bongo flava',
        'icon': '🎵',
        'description': 'Top African music hits, Afrobeats, Amapiano, Bongo Flava & chart toppers'
    },
    'afrobeats': {
        'name': 'Afrobeats & Amapiano',
        'query': 'ytsearch40:latest afrobeats amapiano music videos 2026',
        'icon': '🌍',
        'description': 'Pure African rhythm, Afropop, Amapiano, and Naija grooves'
    },
    'movies': {
        'name': 'Trailers & Cinema',
        'query': 'ytsearch40:latest official movie trailers 2025 2026',
        'icon': '🎬',
        'description': 'Blockbusters, movie trailers & cinema teasers'
    },
    'gaming': {
        'name': 'Gaming World',
        'query': 'ytsearch40:top trending gaming gameplay trailers 2026',
        'icon': '🎮',
        'description': 'Exciting gameplay, walkthroughs & game launches'
    },
    'shorts': {
        'name': 'Viral Shorts',
        'query': 'ytsearch40:best viral youtube shorts popular',
        'icon': '📱',
        'description': 'Quick, captivating short-form video reels'
    },
    'comedy': {
        'name': 'Comedy & Fun',
        'query': 'ytsearch40:best funny comedy sketches viral',
        'icon': '😂',
        'description': 'Top comedy clips, stand-up & hilarious moments'
    }
}

def format_bytes(num_bytes: Optional[float]) -> str:
    if not num_bytes or num_bytes <= 0:
        return "Unknown size"
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if num_bytes < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PB"

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "00:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def get_search_suggestions(query: str) -> List[str]:
    """Fetches real-time search suggestions as user types."""
    query = (query or "").strip()
    if not query:
        return []
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={encoded}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
                return data[1][:8]
    except Exception as e:
        print(f"Suggestions warning: {e}")
    return []

# User Data Persistence (Search History & Saved Playlists)
USER_DATA_DIR = os.path.join(DOWNLOADS_DIR, "user_data")
os.makedirs(USER_DATA_DIR, exist_ok=True)
SEARCH_HISTORY_FILE = os.path.join(USER_DATA_DIR, "search_history.json")
PLAYLISTS_FILE = os.path.join(USER_DATA_DIR, "playlists.json")

def get_user_search_history() -> List[str]:
    try:
        if os.path.exists(SEARCH_HISTORY_FILE):
            with open(SEARCH_HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
    except Exception as e:
        print(f"Error loading search history: {e}")
    return []

def save_user_search(query: str) -> List[str]:
    q = (query or "").strip()
    if not q:
        return get_user_search_history()
    try:
        history = get_user_search_history()
        history = [item for item in history if item.lower() != q.lower()]
        history.insert(0, q)
        history = history[:35]
        with open(SEARCH_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return history
    except Exception as e:
        print(f"Error saving search history: {e}")
        return []

def clear_user_search_history() -> bool:
    try:
        with open(SEARCH_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
        return True
    except Exception as e:
        print(f"Error clearing search history: {e}")
        return False

def get_saved_playlists() -> List[Dict[str, Any]]:
    try:
        if os.path.exists(PLAYLISTS_FILE):
            with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
    except Exception as e:
        print(f"Error loading playlists: {e}")
    return []

def save_user_playlist(name: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    playlist_name = (name or "").strip() or "My Playlist"
    try:
        playlists = get_saved_playlists()
        playlists = [p for p in playlists if p.get("name", "").lower() != playlist_name.lower()]
        new_playlist = {
            "id": str(uuid.uuid4()),
            "name": playlist_name,
            "created_at": time.time(),
            "updated_at": time.time(),
            "count": len(items),
            "thumbnail": items[0].get("thumbnail") if items and isinstance(items[0], dict) else "",
            "items": items
        }
        playlists.insert(0, new_playlist)
        with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
            json.dump(playlists, f, ensure_ascii=False, indent=2)
        return playlists
    except Exception as e:
        print(f"Error saving playlist: {e}")
        return []

def delete_user_playlist(playlist_id_or_name: str) -> List[Dict[str, Any]]:
    target = (playlist_id_or_name or "").strip().lower()
    try:
        playlists = get_saved_playlists()
        playlists = [p for p in playlists if p.get("id") != playlist_id_or_name and p.get("name", "").lower() != target]
        with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
            json.dump(playlists, f, ensure_ascii=False, indent=2)
        return playlists
    except Exception as e:
        print(f"Error deleting playlist: {e}")
        return []

class DownloadTask:
    def __init__(self, url: str, format_id: str, quality_label: str, media_type: str, title: str = "", uploader: str = "", thumbnail: str = ""):
        self.id = str(uuid.uuid4())
        self.url = url
        self.format_id = format_id
        self.quality_label = quality_label
        self.media_type = media_type  # 'video' or 'audio'
        self.title = title or "Fetching metadata..."
        self.uploader = uploader or "Unknown"
        self.thumbnail = thumbnail or ""
        
        self.status = "queued"  # queued, analyzing, downloading, processing, completed, error, cancelled
        self.progress = 0.0
        self.speed = "0 KB/s"
        self.eta = "--:--"
        self.downloaded_bytes = 0
        self.total_bytes = 0
        self.total_bytes_str = "Calculating..."
        self.downloaded_bytes_str = "0 MB"
        
        self.filename = ""
        self.filepath = ""
        self.error_message = ""
        self.created_at = time.time()
        self.completed_at = None
        self._cancel_requested = False

    def cancel(self):
        self._cancel_requested = True
        self.status = "cancelled"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "url": self.url,
            "format_id": self.format_id,
            "quality_label": self.quality_label,
            "media_type": self.media_type,
            "title": self.title,
            "uploader": self.uploader,
            "thumbnail": self.thumbnail,
            "status": self.status,
            "progress": round(self.progress, 1),
            "speed": self.speed,
            "eta": self.eta,
            "downloaded_bytes": self.downloaded_bytes,
            "total_bytes": self.total_bytes,
            "downloaded_str": self.downloaded_bytes_str,
            "total_str": self.total_bytes_str,
            "filename": self.filename,
            "filepath": self.filepath,
            "error_message": self.error_message,
            "created_at": self.created_at,
            "completed_at": self.completed_at
        }

class DownloaderEngine:
    def __init__(self):
        self.tasks: Dict[str, DownloadTask] = {}
        self.explore_cache: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()

    def get_explore_feed(self, category_key: str = "music") -> Dict[str, Any]:
        """Returns live explore feeds with a 15-minute memory cache."""
        cat_key = category_key.lower().strip()
        if cat_key not in EXPLORE_CATEGORIES:
            cat_key = "music"

        cat_meta = EXPLORE_CATEGORIES[cat_key]

        # Check cache
        now = time.time()
        with self.lock:
            cached = self.explore_cache.get(cat_key)
            if cached and (now - cached['timestamp'] < 900):  # 15 minutes TTL
                return {
                    "category": cat_key,
                    "title": cat_meta['name'],
                    "icon": cat_meta['icon'],
                    "description": cat_meta['description'],
                    "results": cached['results']
                }

        # Fetch fresh items
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'skip_download': True,
            'ignoreerrors': True,
            'extractor_args': YOUTUBE_EXTRACTOR_ARGS,
            'http_headers': DEFAULT_HEADERS,
        }
        if FFMPEG_PATH:
            ydl_opts['ffmpeg_location'] = FFMPEG_PATH

        results = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(cat_meta['query'], download=False)
                entries = info.get('entries', []) if info else []
                for entry in entries:
                    if not entry:
                        continue
                    vid_id = entry.get("id") or ""
                    vid_url = entry.get("webpage_url") or entry.get("url") or (f"https://www.youtube.com/watch?v={vid_id}" if vid_id else "")
                    if not vid_url:
                        continue
                    results.append({
                        "id": vid_id,
                        "title": entry.get("title", "Unknown Title"),
                        "uploader": entry.get("uploader") or entry.get("channel", "Unknown Channel"),
                        "duration": format_duration(entry.get("duration")),
                        "duration_sec": entry.get("duration", 0),
                        "view_count": entry.get("view_count", 0),
                        "thumbnail": entry.get("thumbnail") or (entry.get("thumbnails")[-1]["url"] if entry.get("thumbnails") else (f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg" if vid_id else "")),
                        "url": vid_url,
                    })
        except Exception as e:
            print(f"Error fetching explore feed for {cat_key}: {e}")

        # Store cache
        with self.lock:
            self.explore_cache[cat_key] = {
                'timestamp': now,
                'results': results
            }

        return {
            "category": cat_key,
            "title": cat_meta['name'],
            "icon": cat_meta['icon'],
            "description": cat_meta['description'],
            "results": results
        }

    def analyze(self, query_or_url: str) -> Dict[str, Any]:
        """
        Analyzes a URL or query. If it's a URL, returns video metadata and format options.
        If it's a search string, searches YouTube and returns candidate results.
        """
        query_or_url = query_or_url.strip()
        is_url = query_or_url.startswith("http://") or query_or_url.startswith("https://")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': not is_url,
            'skip_download': True,
            'ignoreerrors': True,
            'extractor_args': YOUTUBE_EXTRACTOR_ARGS,
            'http_headers': DEFAULT_HEADERS,
        }
        if FFMPEG_PATH:
            ydl_opts['ffmpeg_location'] = FFMPEG_PATH

        # Automatically store user search / query for future openings
        try:
            save_user_search(query_or_url)
        except Exception:
            pass

        if not is_url:
            # YouTube Search Mode (Full 50 Results)
            search_query = f"ytsearch50:{query_or_url}"
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(search_query, download=False)
                entries = info.get('entries', []) if info else []
                results = []
                for entry in entries:
                    if not entry:
                        continue
                    vid_id = entry.get("id") or ""
                    vid_url = entry.get("webpage_url") or entry.get("url") or (f"https://www.youtube.com/watch?v={vid_id}" if vid_id else "")
                    if not vid_url:
                        continue
                    results.append({
                        "id": vid_id,
                        "title": entry.get("title", "Unknown Title"),
                        "uploader": entry.get("uploader") or entry.get("channel", "Unknown Channel"),
                        "duration": format_duration(entry.get("duration")),
                        "duration_sec": entry.get("duration", 0),
                        "view_count": entry.get("view_count", 0),
                        "thumbnail": entry.get("thumbnail") or (entry.get("thumbnails")[-1]["url"] if entry.get("thumbnails") else (f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg" if vid_id else "")),
                        "url": vid_url,
                    })
                return {
                    "type": "search_results",
                    "query": query_or_url,
                    "results": results
                }

        # Single Video / Media URL Mode
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(query_or_url, download=False)
            if not info:
                raise ValueError("Could not extract media info from this link. Please check if the URL is accessible.")
            
            # Check if playlist
            if 'entries' in info and info['entries']:
                # Return playlist summary
                return {
                    "type": "playlist",
                    "title": info.get("title", "Playlist"),
                    "uploader": info.get("uploader", "Unknown"),
                    "count": len(info['entries']),
                    "entries": [
                        {
                            "id": e.get("id") or "",
                            "title": e.get("title", "Video"),
                            "url": e.get("webpage_url") or e.get("url") or (f"https://www.youtube.com/watch?v={e.get('id')}" if e.get('id') else ""),
                            "duration": format_duration(e.get("duration")),
                            "thumbnail": e.get("thumbnail") or ""
                        }
                        for e in info['entries'] if e
                    ]
                }

            # Single Video Format Extraction
            formats = info.get('formats', [])
            
            # Process available video resolutions
            video_options = []
            audio_options = []
            
            # Standard video target heights
            target_resolutions = [
                {"height": 2160, "label": "4K Ultra HD", "badge": "4K", "res_str": "2160p"},
                {"height": 1440, "label": "2K Quad HD", "badge": "2K", "res_str": "1440p"},
                {"height": 1080, "label": "Full HD 1080p", "badge": "1080p", "res_str": "1080p"},
                {"height": 720, "label": "HD 720p", "badge": "720p", "res_str": "720p"},
                {"height": 480, "label": "Standard 480p", "badge": "480p", "res_str": "480p"},
                {"height": 360, "label": "Medium 360p", "badge": "360p", "res_str": "360p"},
            ]

            available_heights = set()
            for f in formats:
                h = f.get('height')
                if h and f.get('vcodec') != 'none':
                    available_heights.add(h)

            # Map video resolutions
            for target in target_resolutions:
                th = target["height"]
                # Find matching or nearest format
                has_res = any(h >= th - 30 and h <= th + 30 for h in available_heights)
                if has_res or (th == 1080 and any(h >= 1080 for h in available_heights)) or (th == 720 and any(h >= 720 for h in available_heights)):
                    # Estimate size
                    matching_f = next((f for f in formats if f.get('height') and abs(f.get('height') - th) <= 30), None)
                    size_bytes = None
                    if matching_f:
                        size_bytes = matching_f.get('filesize') or matching_f.get('filesize_approx')
                    
                    # If size is unknown, estimate based on duration and bitrate
                    if not size_bytes and info.get('duration'):
                        bitrate_kbps = {2160: 15000, 1440: 8000, 1080: 4000, 720: 2200, 480: 1000, 360: 600}.get(th, 2000)
                        size_bytes = (bitrate_kbps * 1024 * info['duration']) / 8
                    
                    video_options.append({
                        "quality": target["res_str"],
                        "label": target["label"],
                        "badge": target["badge"],
                        "format_id": f"bestvideo[height<={th}]+bestaudio/best[height<={th}]/best",
                        "ext": "mp4",
                        "size_str": format_bytes(size_bytes),
                        "recommended": th == 1080 or (th == 720 and 1080 not in available_heights)
                    })

            # Always ensure at least "Best Quality MP4" is present
            if not video_options:
                video_options.append({
                    "quality": "Best",
                    "label": "Best Available Video",
                    "badge": "HD",
                    "format_id": "bestvideo+bestaudio/best",
                    "ext": "mp4",
                    "size_str": format_bytes(info.get('filesize') or info.get('filesize_approx')),
                    "recommended": True
                })

            # Audio options (MP3 extraction via FFmpeg)
            duration = info.get('duration', 0)
            audio_options = [
                {
                    "quality": "320k",
                    "label": "MP3 High Quality",
                    "badge": "320 kbps",
                    "format_id": "bestaudio/best",
                    "ext": "mp3",
                    "size_str": format_bytes((320 * 1024 * duration) / 8) if duration else "High Fidelity",
                    "recommended": True
                },
                {
                    "quality": "256k",
                    "label": "MP3 Standard Quality",
                    "badge": "256 kbps",
                    "format_id": "bestaudio/best",
                    "ext": "mp3",
                    "size_str": format_bytes((256 * 1024 * duration) / 8) if duration else "Standard",
                    "recommended": False
                },
                {
                    "quality": "128k",
                    "label": "MP3 Fast Download",
                    "badge": "128 kbps",
                    "format_id": "bestaudio/best",
                    "ext": "mp3",
                    "size_str": format_bytes((128 * 1024 * duration) / 8) if duration else "Small Size",
                    "recommended": False
                },
                {
                    "quality": "m4a",
                    "label": "M4A Original Audio",
                    "badge": "M4A",
                    "format_id": "bestaudio[ext=m4a]/bestaudio/best",
                    "ext": "m4a",
                    "size_str": format_bytes((160 * 1024 * duration) / 8) if duration else "Apple M4A",
                    "recommended": False
                }
            ]

            thumbnail = info.get('thumbnail')
            if not thumbnail and info.get('thumbnails'):
                thumbnail = info['thumbnails'][-1]['url']

            return {
                "type": "video",
                "id": info.get("id"),
                "title": info.get("title", "Video"),
                "uploader": info.get("uploader") or info.get("channel", "Unknown Channel"),
                "duration": format_duration(info.get("duration")),
                "duration_sec": info.get("duration", 0),
                "view_count": f"{info.get('view_count', 0):,}" if info.get('view_count') else "N/A",
                "thumbnail": thumbnail or "",
                "webpage_url": info.get("webpage_url") or query_or_url,
                "description": (info.get("description") or "")[:200] + "...",
                "video_options": video_options,
                "audio_options": audio_options
            }

    def start_download(self, url: str, format_id: str, quality_label: str, media_type: str, title: str = "", uploader: str = "", thumbnail: str = "") -> DownloadTask:
        task = DownloadTask(
            url=url,
            format_id=format_id,
            quality_label=quality_label,
            media_type=media_type,
            title=title,
            uploader=uploader,
            thumbnail=thumbnail
        )
        with self.lock:
            self.tasks[task.id] = task
        return task

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        with self.lock:
            return self.tasks.get(task_id)

    def get_all_tasks(self) -> List[Dict[str, Any]]:
        with self.lock:
            return [t.to_dict() for t in sorted(self.tasks.values(), key=lambda x: x.created_at, reverse=True)]

    def cancel_task(self, task_id: str) -> bool:
        with self.lock:
            task = self.tasks.get(task_id)
            if task and task.status in ["queued", "downloading", "processing"]:
                task.cancel()
                return True
        return False

    def clear_task(self, task_id: str) -> bool:
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                return True
        return False

    def _process_queue(self):
        while True:
            next_task: Optional[DownloadTask] = None
            with self.lock:
                for t in self.tasks.values():
                    if t.status == "queued" and not t._cancel_requested:
                        next_task = t
                        break

            if not next_task:
                time.sleep(0.5)
                continue

            self._execute_download(next_task)

    def _execute_download(self, task: DownloadTask):
        task.status = "downloading"
        task.progress = 1.0

        dest_dir = AUDIO_DIR if task.media_type == "audio" else VIDEOS_DIR
        outtmpl = os.path.join(dest_dir, "%(title)s [%(id)s].%(ext)s")

        def progress_hook(d):
            if task._cancel_requested:
                raise Exception("Download cancelled by user.")

            if d['status'] == 'downloading':
                task.status = "downloading"
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes') or 0
                
                if total > 0:
                    task.total_bytes = total
                    task.downloaded_bytes = downloaded
                    task.progress = (downloaded / total) * 100.0
                    task.total_bytes_str = format_bytes(total)
                    task.downloaded_bytes_str = format_bytes(downloaded)

                # Speed & ETA
                speed = d.get('speed')
                if speed:
                    task.speed = f"{format_bytes(speed)}/s"

                eta = d.get('eta')
                if eta is not None:
                    task.eta = format_duration(eta)

            elif d['status'] == 'finished':
                task.status = "processing"
                task.progress = 98.0
                task.filename = os.path.basename(d.get('filename', ''))
                task.filepath = d.get('filename', '')

        # Build yt-dlp options with multi-client resilience
        ydl_opts: Dict[str, Any] = {
            'outtmpl': outtmpl,
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': False,
            'extractor_args': YOUTUBE_EXTRACTOR_ARGS,
            'http_headers': DEFAULT_HEADERS,
            'retries': 10,
            'fragment_retries': 10,
            'socket_timeout': 30,
        }

        if FFMPEG_PATH:
            ydl_opts['ffmpeg_location'] = FFMPEG_PATH

        if task.media_type == "audio":
            if task.quality_label == "m4a":
                ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
            else:
                ydl_opts['format'] = 'bestaudio/best'
                bitrate = task.quality_label.replace("k", "") if "k" in task.quality_label else "320"
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': bitrate,
                }]
        else:
            ydl_opts['format'] = task.format_id
            ydl_opts['merge_output_format'] = 'mp4'

        # Attempt download with automatic multi-client and format fallback cascade
        download_success = False
        last_exception = None

        candidate_formats = [task.format_id]
        if task.media_type == "video":
            candidate_formats.append("bestvideo*+bestaudio/best")
            candidate_formats.append("best")
        elif task.media_type == "audio":
            candidate_formats.append("bestaudio/best")
            candidate_formats.append("best")

        # Client profile cascade: try android_vr, then android, then tv_embedded, then default
        client_profiles = [
            ['android_vr'],
            ['android'],
            ['tv_embedded'],
            ['mweb'],
            None
        ] if ('youtube.com' in task.url or 'youtu.be' in task.url) else [None]

        for client_cfg in client_profiles:
            if download_success or task._cancel_requested:
                break

            if client_cfg:
                ydl_opts['extractor_args'] = {'youtube': {'player_client': client_cfg}}
            else:
                ydl_opts.pop('extractor_args', None)

            for fmt in candidate_formats:
                if task._cancel_requested:
                    break

                ydl_opts['format'] = fmt
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(task.url, download=True)
                        if info:
                            if not task.title or task.title == "Fetching metadata...":
                                task.title = info.get('title', task.title)
                            if not task.uploader or task.uploader == "Unknown":
                                task.uploader = info.get('uploader') or info.get('channel', task.uploader)
                            if not task.thumbnail:
                                task.thumbnail = info.get('thumbnail', '')
                        
                        if not task.filepath:
                            task.filepath = ydl.prepare_filename(info)
                            if task.media_type == "audio" and task.quality_label != "m4a":
                                base, _ = os.path.splitext(task.filepath)
                                task.filepath = f"{base}.mp3"
                            task.filename = os.path.basename(task.filepath)

                    download_success = True
                    break
                except Exception as e:
                    last_exception = e
                    err_lower = str(e).lower()
                    if "cancelled" in err_lower:
                        task.status = "cancelled"
                        return
                    print(f"Download attempt with client {client_cfg} and format {fmt} failed: {e}. Cascading...")
                    time.sleep(0.5)

        if not download_success:
            task.status = "error"
            task.error_message = str(last_exception) if last_exception else "Download failed."
            return

        if task._cancel_requested:
            task.status = "cancelled"
        else:
            # Update final filename in case post-processor changed extension (e.g. webm -> mp3/mp4)
            if task.filepath:
                base, _ = os.path.splitext(task.filepath)
                if task.media_type == "audio" and task.quality_label != "m4a":
                    cand = f"{base}.mp3"
                    if os.path.exists(cand):
                        task.filepath = cand
                        task.filename = os.path.basename(cand)
                elif task.media_type == "video":
                    cand = f"{base}.mp4"
                    if os.path.exists(cand):
                        task.filepath = cand
                        task.filename = os.path.basename(cand)

            task.status = "completed"
            task.progress = 100.0
            task.completed_at = time.time()
            task.eta = "Done"

def get_library_files() -> List[Dict[str, Any]]:
    """Lists all downloaded files in downloads/videos and downloads/audio."""
    items = []
    
    # Scan videos
    if os.path.exists(VIDEOS_DIR):
        for f in os.listdir(VIDEOS_DIR):
            fpath = os.path.join(VIDEOS_DIR, f)
            if os.path.isfile(fpath) and not f.endswith(('.part', '.ytdl', '.temp')):
                stat = os.stat(fpath)
                items.append({
                    "filename": f,
                    "filepath": fpath,
                    "media_type": "video",
                    "size_bytes": stat.st_size,
                    "size_str": format_bytes(stat.st_size),
                    "created_at": stat.st_mtime,
                    "date_str": time.strftime("%Y-%m-%d %H:%M", time.localtime(stat.st_mtime)),
                    "ext": os.path.splitext(f)[1].lstrip('.').lower(),
                    "stream_url": f"/stream/video/{f}"
                })

    # Scan audio
    if os.path.exists(AUDIO_DIR):
        for f in os.listdir(AUDIO_DIR):
            fpath = os.path.join(AUDIO_DIR, f)
            if os.path.isfile(fpath) and not f.endswith(('.part', '.ytdl', '.temp')):
                stat = os.stat(fpath)
                items.append({
                    "filename": f,
                    "filepath": fpath,
                    "media_type": "audio",
                    "size_bytes": stat.st_size,
                    "size_str": format_bytes(stat.st_size),
                    "created_at": stat.st_mtime,
                    "date_str": time.strftime("%Y-%m-%d %H:%M", time.localtime(stat.st_mtime)),
                    "ext": os.path.splitext(f)[1].lstrip('.').lower(),
                    "stream_url": f"/stream/audio/{f}"
                })

    # Sort newest first
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items

# Global instance
engine = DownloaderEngine()
