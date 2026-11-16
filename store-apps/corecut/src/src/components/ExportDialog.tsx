import { useState } from 'react';
import { projectDuration, useEditor } from '../store';
import { canExport, startExport, useExportJob, type Quality } from '../engine/export';
import { hasFsAccess, isAbort } from '../fs';
import { formatTime } from '../util';
import { isAndroidApp } from '../nativeFiles';

// The chosen export folder is remembered while CoreCut is open.
let lastDir: FileSystemDirectoryHandle | null = null;

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project);
  const [name, setName] = useState(project.name || 'Untitled');
  const [quality, setQuality] = useState<Quality>('high');
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(lastDir);
  const duration = projectDuration(project);
  const missing = project.media.filter((m) => !m.url && project.clips.some((c) => c.mediaId === m.id)).length;
  const fsOk = hasFsAccess();

  const chooseFolder = async () => {
    try {
      const d = await window.showDirectoryPicker!({ id: 'cutline-export', mode: 'readwrite', startIn: dir ?? 'videos' });
      lastDir = d;
      setDir(d);
    } catch (e) {
      if (!isAbort(e)) alert((e as Error).message);
    }
  };

  const go = () => {
    const fileName = `${name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'export'}.mp4`;
    // export a snapshot, so editing during the export doesn't change the file being made
    void startExport(useEditor.getState().project, { fileName, dir, quality });
    onClose();
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Export video">
        <h3>Export video</h3>
        {!canExport() ? (
          <p className="warn">This browser can't encode video. Open CoreCut in Chrome or Edge to export.</p>
        ) : (
          <>
            <label className="field">
              <span>File name</span>
              <div className="row">
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <span className="dim">.mp4</span>
              </div>
            </label>
            <div className="field">
              <span>Save to</span>
              {fsOk ? (
                <div className="row">
                  <span className={`folder ${dir ? '' : 'dim'}`}>📁 {dir ? dir.name : 'No folder chosen'}</span>
                  <button onClick={chooseFolder}>{dir ? 'Change…' : 'Choose folder…'}</button>
                </div>
              ) : (
                <span className="dim">{isAndroidApp() ? 'Choose a save or share destination after rendering.' : "Your browser's Downloads folder (use Chrome or Edge to pick a folder)."}</span>
              )}
            </div>
            <label className="field">
              <span>Quality</span>
              <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
                <option value="high">High (best for upload)</option>
                <option value="medium">Medium</option>
                <option value="small">Small file</option>
              </select>
            </label>
            <p className="dim small">
              {project.width}×{project.height} · {project.fps} fps · {formatTime(duration, project.fps)} · MP4 (H.264 + AAC).
              It renders the whole timeline in the background, so you can keep editing.
            </p>
            {missing > 0 && <p className="warn">{missing} clip(s) are offline and will export as black/silent. Relink them first.</p>}
          </>
        )}
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!canExport() || duration <= 0 || (fsOk && !dir)} onClick={go}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small status pill for the top bar while an export runs in the background. */
export function ExportStatus() {
  const job = useExportJob();
  if (job.running) {
    return (
      <span className="export-status">
        <span className="bar"><span style={{ width: `${Math.round(job.progress * 100)}%` }} /></span>
        {job.phase} {job.phase === 'Rendering video' ? `${Math.round(job.progress * 100)}%` : '…'}
        <button className="link" onClick={() => job.cancel?.()}>Cancel</button>
      </span>
    );
  }
  if (job.result) {
    return (
      <span className={`export-status ${job.result.ok ? 'ok' : 'err'}`}>
        {job.result.ok ? '✓ ' : ''}
        {job.result.message}
        <button className="link" onClick={() => useExportJob.setState({ result: null })}>✕</button>
      </span>
    );
  }
  return null;
}
