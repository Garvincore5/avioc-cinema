import { useState } from 'react';
import { useEditor } from '../store';
import { applySync, cutToVideo } from './plan';
import { solveSync, syncableClips, type FileResult } from './solve';
import './sync.css';

/** Timeline toolbar button that opens the auto-sync panel. */
export function SyncButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title="Line up clips recorded at the same time by their sound">⇄ Auto sync</button>
      {open && <SyncPanel onClose={() => setOpen(false)} />}
    </>
  );
}

type Phase = { kind: 'idle' } | { kind: 'working'; done: number; total: number; label: string } | { kind: 'done'; results: FileResult[]; note: string } | { kind: 'error'; message: string };

function SyncPanel({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selected = syncableClips(project, selectedIds);
  const all = syncableClips(project, project.clips.map((c) => c.id));
  const [scope, setScope] = useState<'selected' | 'all'>(selected.length >= 2 ? 'selected' : 'all');
  const [muteCam, setMuteCam] = useState(true);
  const [cut, setCut] = useState(true);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const working = phase.kind === 'working';

  const run = async () => {
    const ids = (scope === 'selected' ? selected : all).map((c) => c.id);
    setPhase({ kind: 'working', done: 0, total: 1, label: 'Starting…' });
    try {
      const { placement, results } = await solveSync(useEditor.getState().project, ids, (done, total, label) =>
        setPhase({ kind: 'working', done, total, label }),
      );
      const synced = results.filter((r) => r.status !== 'failed').length;
      if (!placement || synced < 2) {
        setPhase({ kind: 'done', results, note: 'Nothing was moved: no two recordings had matching sound.' });
        return;
      }
      let removed = 0;
      let gaps = 0;
      // apply + cut as one undo step
      useEditor.getState().commit((p) => {
        const { project: moved, moved: movedIds } = applySync(p, ids, placement, { muteCameraAudio: muteCam });
        if (!cut) return moved;
        const r = cutToVideo(moved, movedIds);
        removed = r.removed;
        gaps = r.gaps.length;
        return r.project;
      });
      const parts = [`Synced ${synced} recordings.`];
      if (cut) parts.push(gaps ? `Cut ${removed.toFixed(1)} s of audio with no video (${gaps} gap${gaps > 1 ? 's' : ''}) and closed the gaps.` : 'Every part of the audio has video, so nothing was cut.');
      parts.push('Ctrl+Z undoes it.');
      setPhase({ kind: 'done', results, note: parts.join(' ') });
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message });
    }
  };

  return (
    <div className="sy-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !working && onClose()}>
      <div className="sy-panel" role="dialog" aria-label="Auto sync">
        <div className="sy-head">
          <strong>Auto sync</strong>
          <span className="spacer" />
          <button onClick={onClose} disabled={working} aria-label="Close">✕</button>
        </div>
        <div className="sy-body">
          <p className="dim">
            Lines up video and audio recorded at the same time by matching their sound, like a clap or speech.
            Separate audio from a recorder and several cameras both work.
          </p>
          <fieldset disabled={working}>
            <label>
              <input type="radio" checked={scope === 'selected'} disabled={selected.length < 2} onChange={() => setScope('selected')} />
              Selected clips ({selected.length})
            </label>
            <label>
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
              All clips on the timeline ({all.length})
            </label>
            <label>
              <input type="checkbox" checked={muteCam} onChange={(e) => setMuteCam(e.target.checked)} />
              Mute the camera sound when separate audio is synced
            </label>
            <label>
              <input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} />
              Cut the audio where there's no video, then close the gaps (ripple delete)
            </label>
          </fieldset>

          {phase.kind === 'working' && (
            <div className="sy-progress">
              <div className="sy-bar"><span style={{ width: `${(100 * phase.done) / Math.max(1, phase.total)}%` }} /></div>
              <span className="dim small">{phase.label}</span>
            </div>
          )}
          {phase.kind === 'error' && <div className="warn">{phase.message}</div>}
          {phase.kind === 'done' && (
            <>
              <p>{phase.note}</p>
              <ul className="sy-results">
                {phase.results.map((r) => (
                  <li key={r.media.id} className={r.status}>
                    <span className="sy-icon">{r.status === 'failed' ? '✕' : r.status === 'reference' ? '★' : '✓'}</span>
                    <span className="sy-name">{r.media.name}</span>
                    <span className="dim small">
                      {r.status === 'reference' && 'reference'}
                      {r.status === 'synced' && `${r.offset! >= 0 ? '+' : ''}${r.offset!.toFixed(3)} s${r.via ? ` via ${r.via}` : ''} · ${quality(r.confidence!)}`}
                      {r.status === 'failed' && r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="sy-foot">
          <span className="spacer" />
          {phase.kind === 'done' ? (
            <button className="primary" onClick={onClose}>Done</button>
          ) : (
            <button className="primary" disabled={working || (scope === 'selected' ? selected : all).length < 2} onClick={run}>
              {working ? 'Syncing…' : 'Sync'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const quality = (c: number) => (c >= 12 ? 'strong match' : c >= 8 ? 'good match' : 'weak match, check it');
