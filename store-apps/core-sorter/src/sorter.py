"""A small, safe-to-preview file organizer for Windows, macOS, and Linux."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk


IMAGE_TYPES = {
    ".jpg": "JPEG", ".jpeg": "JPEG", ".jpe": "JPEG",
    ".png": "PNG", ".gif": "GIF", ".webp": "WEBP", ".bmp": "BMP",
    ".tif": "TIFF", ".tiff": "TIFF", ".heic": "HEIC", ".heif": "HEIC",
    ".avif": "AVIF", ".ico": "Icons", ".svg": "SVG",
    ".raw": "RAW", ".dng": "RAW", ".arw": "RAW", ".cr2": "RAW",
    ".cr3": "RAW", ".nef": "RAW", ".nrw": "RAW", ".orf": "RAW",
    ".rw2": "RAW", ".raf": "RAW", ".pef": "RAW", ".srw": "RAW",
    ".3fr": "RAW", ".fff": "RAW", ".iiq": "RAW", ".kdc": "RAW",
    ".dcr": "RAW", ".mos": "RAW", ".mrw": "RAW", ".x3f": "RAW",
}
AUDIO_TYPES = {
    ".mp3": "MP3", ".wav": "WAV", ".flac": "FLAC", ".aac": "AAC",
    ".m4a": "M4A", ".ogg": "OGG", ".opus": "OPUS", ".wma": "WMA",
    ".aiff": "AIFF", ".aif": "AIFF", ".mid": "MIDI", ".midi": "MIDI",
}
VIDEO_TYPES = {
    ".mp4": "MP4", ".m4v": "MP4", ".mov": "MOV", ".mkv": "MKV",
    ".avi": "AVI", ".webm": "WEBM", ".wmv": "WMV", ".mpg": "MPEG",
    ".mpeg": "MPEG", ".m2ts": "MPEG-TS", ".mts": "MPEG-TS",
    ".3gp": "3GP", ".flv": "FLV",
}
DOCUMENT_TYPES = {
    ".pdf": "PDF", ".doc": "Word", ".docx": "Word", ".odt": "Word",
    ".rtf": "Word", ".txt": "Text", ".md": "Text", ".csv": "Spreadsheets",
    ".xls": "Spreadsheets", ".xlsx": "Spreadsheets", ".ods": "Spreadsheets",
    ".ppt": "Presentations", ".pptx": "Presentations", ".odp": "Presentations",
}
ARCHIVE_TYPES = {".zip": "ZIP", ".7z": "7Z", ".rar": "RAR", ".tar": "TAR", ".gz": "GZIP"}


def has_slow_motion_metadata(path: Path) -> bool:
    """Look for explicit slow-motion metadata and slow-playback/high-rate clues."""
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return False
    try:
        result = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries",
             "format=duration:format_tags:stream=codec_type,avg_frame_rate,r_frame_rate,duration:stream_tags",
             "-of", "json", str(path)], capture_output=True, text=True, timeout=10, check=True,
        )
        import json
        data = json.loads(result.stdout)
        tags = dict(data.get("format", {}).get("tags", {}))
        for stream in data.get("streams", []):
            tags.update(stream.get("tags", {}))
        marker = " ".join([*tags.keys(), *map(str, tags.values())]).casefold()
        if any(term in marker for term in ("slow motion", "slow-motion", "slow_motion", "slowmo", "slo-mo", "slomo")):
            return True
        # Slow-motion exports often retain a high capture rate while timestamps
        # stretch playback to a normal rate. Equal rates indicate ordinary HFR.
        for stream in data.get("streams", []):
            if stream.get("codec_type") != "video":
                continue
            capture = _rate(stream.get("r_frame_rate"))
            playback = _rate(stream.get("avg_frame_rate"))
            if capture >= 90 and 0 < playback <= 60 and capture / playback >= 1.5:
                return True
    except (OSError, subprocess.SubprocessError, ValueError, KeyError):
        pass
    return False


def _rate(value: str | None) -> float:
    try:
        numerator, denominator = value.split("/", 1)  # type: ignore[union-attr]
        return float(numerator) / float(denominator)
    except (AttributeError, ValueError, ZeroDivisionError):
        return 0.0


def category_for(path: Path, slow_motion: bool = False) -> str:
    ext = path.suffix.lower()
    if ext in IMAGE_TYPES:
        group = IMAGE_TYPES[ext]
        return "RAW" if group == "RAW" else group
    if ext in VIDEO_TYPES:
        return "Slow Motion Videos" if slow_motion else "Videos"
    if ext in AUDIO_TYPES:
        return "Audio"
    if ext in DOCUMENT_TYPES:
        if ext == ".pdf":
            return "PDF"
        if ext in {".doc", ".docx", ".odt", ".rtf"}:
            return "Word Files"
        if ext in {".xls", ".xlsx", ".ods", ".csv"}:
            return "Spreadsheet Files"
        if ext in {".ppt", ".pptx", ".odp"}:
            return "Presentation Files"
        return "Text Files"
    if ext in ARCHIVE_TYPES:
        return "Archives"
    if ext == ".psd":
        return "PSD"
    if ext == ".py":
        return "PY Files"
    if ext in {".exe", ".msi", ".app", ".deb", ".rpm", ".dmg"}:
        return "Applications"
        return f"{ext[1:].upper()} Files" if ext else "Other Files"


def unique_destination(path: Path) -> Path:
    if not path.exists():
        return path
    index = 2
    while True:
        candidate = path.with_name(f"{path.stem} ({index}){path.suffix}")
        if not candidate.exists():
            return candidate
        index += 1


def open_path(path: Path) -> None:
    if sys.platform == "win32":
        os.startfile(str(path))  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])
    else:
        subprocess.Popen(["xdg-open", str(path)])


class SorterApp(tk.Tk):
    BG = "#0b1220"
    PANEL = "#111c2e"
    TEXT = "#e8eef8"
    MUTED = "#91a0b7"
    ACCENT = "#69e0c0"

    def __init__(self) -> None:
        super().__init__()
        self.title("Core Sorter · File organizer")
        self.geometry("1050x700")
        self.minsize(760, 520)
        self.configure(bg=self.BG)
        self.folder: Path | None = None
        self.plans: list[tuple[Path, str]] = []
        self._style()
        self._build()

    def _style(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Treeview", background=self.PANEL, foreground=self.TEXT,
                        fieldbackground=self.PANEL, rowheight=38, borderwidth=0,
                        font=("Segoe UI", 10))
        style.configure("Treeview.Heading", background="#18253a", foreground=self.MUTED,
                        font=("Segoe UI Semibold", 9), borderwidth=0, padding=10)
        style.map("Treeview", background=[("selected", "#1e3d4a")],
                  foreground=[("selected", self.TEXT)])

    def _build(self) -> None:
        top = tk.Frame(self, bg=self.BG)
        top.pack(fill="x", padx=34, pady=(26, 12))
        tk.Label(top, text="SORTLY", bg=self.BG, fg=self.ACCENT,
                 font=("Segoe UI Semibold", 10)).pack(anchor="w")
        tk.Label(top, text="A calmer place for every file.", bg=self.BG, fg=self.TEXT,
                 font=("Segoe UI Semibold", 25)).pack(anchor="w", pady=(4, 2))
        tk.Label(top, text="Preview the plan, then sort your files into tidy folders.",
                 bg=self.BG, fg=self.MUTED, font=("Segoe UI", 11)).pack(anchor="w")

        bar = tk.Frame(self, bg=self.PANEL, padx=14, pady=12)
        bar.pack(fill="x", padx=34, pady=(14, 12))
        self.path_label = tk.Label(bar, text="Choose a folder to get started", bg=self.PANEL,
                                   fg=self.MUTED, font=("Segoe UI", 10), anchor="w")
        self.path_label.pack(side="left", fill="x", expand=True, padx=(3, 14))
        self._button(bar, "Choose folder", self.choose_folder).pack(side="right", padx=(8, 0))
        self._button(bar, "Refresh", self.refresh, secondary=True).pack(side="right")

        self.tree = ttk.Treeview(self, columns=("kind", "size", "destination"), show="headings")
        self.tree.heading("kind", text="TYPE")
        self.tree.heading("size", text="SIZE")
        self.tree.heading("destination", text="SORTS INTO")
        self.tree.heading("#0", text="FILE")
        self.tree["columns"] = ("name", "kind", "size", "destination")
        self.tree.heading("name", text="FILE")
        self.tree.column("name", width=330, anchor="w")
        self.tree.column("kind", width=120, anchor="w")
        self.tree.column("size", width=110, anchor="e")
        self.tree.column("destination", width=300, anchor="w")
        self.tree.pack(fill="both", expand=True, padx=34, pady=0)
        self.tree.bind("<Double-1>", self.open_selected)

        bottom = tk.Frame(self, bg=self.BG)
        bottom.pack(fill="x", padx=34, pady=(14, 24))
        self.status = tk.Label(bottom, text="Select a folder to see a preview.", bg=self.BG,
                               fg=self.MUTED, font=("Segoe UI", 10))
        self.status.pack(side="left", fill="x", expand=True)
        self._button(bottom, "Open selected", self.open_selected, secondary=True).pack(side="right", padx=(8, 0))
        self._button(bottom, "Sort files", self.apply_sort).pack(side="right")
        tk.Label(self, text="Only files directly inside the selected folder are included. Nothing moves until you choose Sort files.",
                 bg=self.BG, fg="#73829a", font=("Segoe UI", 9)).pack(anchor="w", padx=34, pady=(0, 16))

    def _button(self, parent: tk.Widget, label: str, command, secondary: bool = False) -> tk.Button:
        return tk.Button(parent, text=label, command=command, relief="flat", borderwidth=0,
                         padx=16, pady=9, cursor="hand2",
                         bg="#1b2b40" if secondary else self.ACCENT,
                         fg=self.TEXT if secondary else "#071713",
                         activebackground="#29415e" if secondary else "#8cf0d6",
                         font=("Segoe UI Semibold", 10))

    def choose_folder(self) -> None:
        selected = filedialog.askdirectory(title="Choose a folder to organize")
        if selected:
            self.folder = Path(selected)
            self.path_label.configure(text=str(self.folder), fg=self.TEXT)
            self.refresh()

    def refresh(self) -> None:
        if not self.folder:
            return
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.plans = []
        try:
            entries = sorted((p for p in self.folder.iterdir() if p.is_file() and not p.is_symlink()),
                             key=lambda p: p.name.casefold())
        except OSError as exc:
            messagebox.showerror("Can't read folder", str(exc))
            return
        for path in entries:
            category = category_for(path, has_slow_motion_metadata(path) if path.suffix.lower() in VIDEO_TYPES else False)
            size = self._format_size(path.stat().st_size)
            self.tree.insert("", "end", values=(path.name, category.split("/")[0], size, category))
            self.plans.append((path, category))
        self.status.configure(text=f"{len(entries)} file{'s' if len(entries) != 1 else ''} ready to sort")

    @staticmethod
    def _format_size(size: int) -> str:
        value = float(size)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if value < 1024 or unit == "TB":
                return f"{value:.0f} {unit}" if unit == "B" else f"{value:.1f} {unit}"
            value /= 1024
        return ""

    def open_selected(self, _event=None) -> None:
        selected = self.tree.selection()
        if not selected:
            return
        name = self.tree.item(selected[0], "values")[0]
        try:
            open_path(self.folder / name)  # type: ignore[operator]
        except (OSError, FileNotFoundError) as exc:
            messagebox.showerror("Can't open file", str(exc))

    def apply_sort(self) -> None:
        if not self.folder:
            messagebox.showinfo("Choose a folder", "Choose a folder first to preview its files.")
            return
        if not self.plans:
            self.refresh()
        if not self.plans:
            return
        yes = messagebox.askyesno(
            "Sort these files?",
            f"Move {len(self.plans)} file(s) into category folders inside:\n\n{self.folder}\n\n"
            "Existing files will be kept; name conflicts get a numbered copy.",
        )
        if not yes:
            return
        moved = 0
        errors: list[str] = []
        for source, category in self.plans:
            try:
                destination_dir = self.folder / category
                destination_dir.mkdir(parents=True, exist_ok=True)
                destination = unique_destination(destination_dir / source.name)
                shutil.move(str(source), str(destination))
                moved += 1
            except OSError as exc:
                errors.append(f"{source.name}: {exc}")
        self.refresh()
        if errors:
            messagebox.showwarning("Sort completed with some errors",
                                   f"Moved {moved} file(s).\n\n" + "\n".join(errors[:8]))
        else:
            messagebox.showinfo("All sorted", f"Moved {moved} file(s) into their folders.")


if __name__ == "__main__":
    SorterApp().mainloop()
