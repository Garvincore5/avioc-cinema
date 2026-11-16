import { useRef, useState } from 'react';
import { useEditor } from '../store';
import { formatTime } from '../util';
import { AudioBrowserButton } from '../audio/AudioBrowser';
import { MEDIA_TYPES, isAbort } from '../fs';
import { importMedia, sourcesFromDrop } from '../mediaImport';
import { relinkFiles, relinkFromFolder, useProjectFile } from '../projectFile';

export function MediaBin() {
  const media = useEditor((s) => s.project.media);
  const fps = useEditor((s) => s.project.fps);
  const projectHandle = useProjectFile((s) => s.handle);
  const missing = media.filter((m) => !m.url);
  const inputRef = useRef<HTMLInputElement>(null);
  const relinkRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);

  const pickFiles = async () => {
    if (!window.showOpenFilePicker) return inputRef.current?.click();
    try {
      const handles = await window.showOpenFilePicker({ multiple: true, types: MEDIA_TYPES, id: 'cutline-media' });
      await importMedia(handles);
    } catch (e) {
      if (!isAbort(e)) alert((e as Error).message);
    }
  };

  // Click = one item, Ctrl/Cmd+click = toggle, Shift+click = range (like a file explorer).
  const onPick = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey && anchor) {
      const a = media.findIndex((m) => m.id === anchor);
      const b = media.findIndex((m) => m.id === id);
      setPicked(media.slice(Math.min(a, b), Math.max(a, b) + 1).map((m) => m.id));
      return;
    }
    setAnchor(id);
    if (e.ctrlKey || e.metaKey) setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    else setPicked([id]);
  };

  const addPicked = () => {
    const ids = media.filter((m) => picked.includes(m.id) && m.url).map((m) => m.id); // keep bin order
    if (ids.length) useEditor.getState().addClipsFromMedia(ids);
  };

  const relink = () => {
    if (window.showDirectoryPicker) void relinkFromFolder(projectHandle ?? undefined);
    else relinkRef.current?.click();
  };

  return (
    <aside
      className="bin"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          const sources = await sourcesFromDrop(e.dataTransfer);
          await importMedia(sources);
        }
      }}
    >
      <div className="bin-head">
        <h4>Media</h4>
        <AudioBrowserButton />
        <button onClick={pickFiles}>+ Import</button>
        <input ref={inputRef} type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={(e) => e.target.files && importMedia(Array.from(e.target.files))} />
      </div>
      {missing.length > 0 && (
        <div className="warn">
          {missing.length} clip(s) need relinking.{' '}
          <button className="link" onClick={relink}>Find clips folder…</button>
          <input ref={relinkRef} type="file" multiple hidden onChange={(e) => e.target.files && relinkFiles(e.target.files)} />
        </div>
      )}
      {media.length === 0 && <p className="dim hint">Drop videos, music or images here.</p>}
      {picked.length > 0 && (
        <div className="bin-actions">
          <button className="primary" onClick={addPicked}>
            Add {picked.length > 1 ? `${picked.length} clips` : 'clip'} to timeline
          </button>
          <button className="link" onClick={() => setPicked(media.map((m) => m.id))}>All</button>
          <button className="link" onClick={() => setPicked([])}>None</button>
        </div>
      )}
      <ul>
        {media.map((m) => (
          <li
            key={m.id}
            draggable
            onClick={(e) => onPick(e, m.id)}
            onDragStart={(e) => {
              // dragging a picked item drags every picked item; otherwise just this one
              const ids = picked.includes(m.id) ? media.filter((x) => picked.includes(x.id)).map((x) => x.id) : [m.id];
              e.dataTransfer.setData('application/x-media-ids', JSON.stringify(ids));
              e.dataTransfer.setData('application/x-media-id', m.id);
            }}
            onDoubleClick={() => useEditor.getState().addClipFromMedia(m.id)}
            title="Ctrl/Shift+click to pick several, then drag them to the timeline or press Add. Double-click adds one at the playhead."
            className={`${m.url ? '' : 'missing'} ${picked.includes(m.id) ? 'picked' : ''}`}
          >
            <span className={`badge ${m.kind}`}>{m.kind === 'video' ? '🎬' : m.kind === 'audio' ? '🎵' : '🖼'}</span>
            <span className="name">{m.name}</span>
            <span className="dim">{m.kind === 'image' ? '' : formatTime(m.duration, fps)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
