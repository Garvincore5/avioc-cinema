import { useEffect, useRef, useState } from 'react';
import { useEditor } from './store';
import { MediaBin } from './components/MediaBin';
import { Preview } from './components/Preview';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { engine } from './engine/engine';
import { ExportDialog, ExportStatus } from './components/ExportDialog';
import { isDirty, openProject, saveProject, useProjectFile } from './projectFile';
import { hasFsAccess } from './fs';

const RESOLUTIONS = { '720p': [1280, 720], '1080p': [1920, 1080], '4K': [3840, 2160], 'Vertical 1080': [1080, 1920], 'Square': [1080, 1080] } as const;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useEditor((s) => s.project);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const [exportOpen, setExportOpen] = useState(false);
  const file = useProjectFile();
  const dirty = isDirty(project, file.saved);

  useKeyboard();

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (isDirty(useEditor.getState().project, useProjectFile.getState().saved)) e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const setRes = (key: keyof typeof RESOLUTIONS) => {
    const [width, height] = RESOLUTIONS[key];
    useEditor.getState().commit((p) => ({ ...p, width, height }));
  };
  const resKey = (Object.keys(RESOLUTIONS) as (keyof typeof RESOLUTIONS)[]).find(
    (k) => RESOLUTIONS[k][0] === project.width && RESOLUTIONS[k][1] === project.height,
  );

  return (
    <div className="app">
      <header className="topbar">
        <strong className="logo">CoreCut</strong>
        <input className="project-name" value={project.name} onChange={(e) => useEditor.setState((s) => ({ project: { ...s.project, name: e.target.value } }))} />
        <button disabled={!canUndo} onClick={() => useEditor.getState().undo()} title="Undo (Ctrl+Z)">↶</button>
        <button disabled={!canRedo} onClick={() => useEditor.getState().redo()} title="Redo (Ctrl+Shift+Z)">↷</button>
        <span className="spacer" />
        <select value={resKey} onChange={(e) => setRes(e.target.value as keyof typeof RESOLUTIONS)}>
          {Object.keys(RESOLUTIONS).map((k) => <option key={k}>{k}</option>)}
        </select>
        <span className="save-state dim" title={file.fileName ?? 'Not saved yet'}>
          {(!dirty && file.status) || (file.fileName ? `${file.fileName}${dirty ? ' • unsaved' : ''}` : dirty ? 'Not saved' : '')}
        </span>
        {hasFsAccess() ? (
          <button onClick={() => openProject()} title="Open a .core project">Open</button>
        ) : (
          <label className="button">
            Open
            <input type="file" accept=".core,.json" hidden onChange={(e) => e.target.files?.[0] && openProject(e.target.files[0])} />
          </label>
        )}
        <button onClick={() => saveProject()} title="Save (Ctrl+S)">Save</button>
        <button onClick={() => saveProject(true)} title="Save to a new .core file (Ctrl+Shift+S)">Save as…</button>
        <ExportStatus />
        <button className="primary" onClick={() => setExportOpen(true)}>Export…</button>
      </header>
      <main className="workspace">
        <MediaBin />
        <Preview canvasRef={canvasRef} />
        <Inspector />
      </main>
      <Timeline />
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  );
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveProject(e.shiftKey);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        void openProject();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const frame = 1 / s.project.fps;
      if (e.code === 'Space') {
        e.preventDefault();
        engine.ensureAudio();
        s.setPlaying(!s.playing);
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && e.key.toLowerCase() === 'y') s.redo();
      else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        s.selectAll();
      } else if (e.key === 'Escape') s.select(null);
      else if (e.key === 's' || (mod && e.key === 'b')) {
        e.preventDefault();
        s.splitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') s.deleteSelected(e.shiftKey);
      else if (e.key === 'ArrowLeft') s.setTime(s.time - (e.shiftKey ? 1 : frame));
      else if (e.key === 'ArrowRight') s.setTime(s.time + (e.shiftKey ? 1 : frame));
      else if (e.key === 'Home') s.setTime(0);
      else if (e.key === '=' || e.key === '+') s.setZoom(s.pxPerSec * 1.25);
      else if (e.key === '-') s.setZoom(s.pxPerSec / 1.25);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
