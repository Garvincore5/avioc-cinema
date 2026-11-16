import { useRef } from 'react';
import { beginGesture, projectDuration, useEditor } from '../store';
import type { Clip } from '../types';
import { effectiveTransition, prevAdjacent } from '../engine/transitions';
import { importMedia, sourcesFromDrop } from '../mediaImport';
import { SyncButton } from '../sync/SyncPanel';

const TRACK_H = 56;
const HEADER_W = 92;
const SNAP_PX = 8;

export function Timeline() {
  const project = useEditor((s) => s.project);
  const time = useEditor((s) => s.time);
  const pxPerSec = useEditor((s) => s.pxPerSec);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const selectedIds = useEditor((s) => s.selectedIds);
  const snapping = useEditor((s) => s.snapping);
  const scrollRef = useRef<HTMLDivElement>(null);

  const length = Math.max(projectDuration(project) + 30, 60);
  const width = length * pxPerSec;

  const xToTime = (clientX: number) => {
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left - HEADER_W + el.scrollLeft) / pxPerSec);
  };

  const snapPoints = (exclude: string[]) => {
    const pts = [0, useEditor.getState().time];
    for (const c of useEditor.getState().project.clips) {
      if (exclude.includes(c.id)) continue;
      pts.push(c.start, c.start + c.duration);
    }
    return pts;
  };
  const snap = (t: number, exclude: string[], also?: number) => {
    if (!useEditor.getState().snapping) return t;
    const tol = SNAP_PX / useEditor.getState().pxPerSec;
    for (const p of snapPoints(exclude)) {
      if (Math.abs(p - t) < tol) return p;
      // snap the clip's end too
      if (also !== undefined && Math.abs(p - (t + also)) < tol) return p - also;
    }
    return t;
  };

  const scrub = (e: React.PointerEvent) => {
    const { setTime, setPlaying } = useEditor.getState();
    setPlaying(false);
    setTime(xToTime(e.clientX));
    const move = (ev: PointerEvent) => setTime(xToTime(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dragClip = (e: React.PointerEvent, clip: Clip, mode: 'move' | 'left' | 'right') => {
    e.stopPropagation();
    const st = useEditor.getState();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) {
      // Shift/Ctrl/Cmd+click adds or removes a clip from the selection
      st.select(clip.id, true);
      return;
    }
    // clicking a clip that's already part of a multi-selection keeps the group so it can be dragged together
    if (!st.selectedIds.includes(clip.id)) st.select(clip.id);
    else useEditor.setState({ selectedClipId: clip.id });
    const group = mode === 'move' ? useEditor.getState().selectedIds : [clip.id];
    beginGesture();
    const startX = e.clientX;
    const origin = new Map(st.project.clips.filter((c) => group.includes(c.id)).map((c) => [c.id, c.start]));
    const earliest = Math.min(...origin.values());
    const track = project.tracks.find((t) => t.id === clip.trackId)!;
    let lastDelta = 0;

    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / pxPerSec;
      const s = useEditor.getState();
      if (mode === 'move') {
        // snap using the grabbed clip, then move the whole group by the same amount
        const snapped = snap(clip.start + delta, group, clip.duration);
        const d = Math.max(snapped - clip.start, -earliest);
        if (group.length === 1) {
          // a single clip can also change track (same kind only)
          const rect = scrollRef.current!.getBoundingClientRect();
          const row = Math.floor((ev.clientY - rect.top - 24 + scrollRef.current!.scrollTop) / TRACK_H);
          const over = s.project.tracks[row];
          const trackId = over && over.kind === track.kind ? over.id : s.project.clips.find((c) => c.id === clip.id)!.trackId;
          s.moveClip(clip.id, clip.start + d, trackId);
        } else {
          useEditor.setState((cur) => ({
            project: { ...cur.project, clips: cur.project.clips.map((c) => (origin.has(c.id) ? { ...c, start: origin.get(c.id)! + d } : c)) },
          }));
        }
      } else {
        const cur = s.project.clips.find((c) => c.id === clip.id)!;
        const edge = mode === 'left' ? cur.start : cur.start + cur.duration;
        const target = snap(mode === 'left' ? clip.start + delta : clip.start + clip.duration + delta, [clip.id]);
        const step = target - edge;
        if (Math.abs(step) > 1e-6) s.trimClip(clip.id, mode, step);
      }
      lastDelta = delta;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (lastDelta === 0) {
        useEditor.setState((s) => ({ past: s.past.slice(0, -1) })); // plain click: no history entry
        // plain click on a member of a group collapses the selection to that clip
        if (group.length > 1) useEditor.getState().select(clip.id);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onDrop = async (e: React.DragEvent) => {
    const rect = scrollRef.current!.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top - 24 + scrollRef.current!.scrollTop) / TRACK_H);
    const trackId = project.tracks[row]?.id;
    const at = xToTime(e.clientX);
    const many = e.dataTransfer.getData('application/x-media-ids');
    const one = e.dataTransfer.getData('application/x-media-id');
    if (many || one) {
      e.preventDefault();
      const ids: string[] = many ? JSON.parse(many) : [one];
      useEditor.getState().addClipsFromMedia(ids, trackId, at);
    } else if (e.dataTransfer.files.length) {
      // files straight from the desktop: import them, then lay them out end to end
      e.preventDefault();
      const ids = await importMedia(await sourcesFromDrop(e.dataTransfer));
      if (ids.length) useEditor.getState().addClipsFromMedia(ids, trackId, at);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      useEditor.getState().setZoom(pxPerSec * (e.deltaY < 0 ? 1.15 : 0.87));
    }
  };

  // ruler ticks adapt to zoom
  const tickEvery = [0.5, 1, 2, 5, 10, 30, 60].find((s) => s * pxPerSec >= 70) ?? 120;
  const ticks = Array.from({ length: Math.ceil(length / tickEvery) }, (_, i) => i * tickEvery);

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <button onClick={() => useEditor.getState().splitAtPlayhead()} title="Split at playhead (S)">✂ Split</button>
        <button onClick={() => useEditor.getState().deleteSelected(true)} title="Ripple delete (Shift+Del)">Ripple delete</button>
        <SyncButton />
        <button onClick={() => useEditor.getState().addTextClip()}>T Text</button>
        <button onClick={() => useEditor.getState().addTrack('video')}>+ Video track</button>
        <button onClick={() => useEditor.getState().addTrack('audio')}>+ Audio track</button>
        <label className="toggle">
          <input type="checkbox" checked={snapping} onChange={() => useEditor.getState().toggleSnapping()} /> Snap
        </label>
        <span className="spacer" />
        <span className="dim">Zoom</span>
        <input type="range" min={5} max={400} value={pxPerSec} onChange={(e) => useEditor.getState().setZoom(+e.target.value)} />
      </div>

      <div className="timeline-body" ref={scrollRef} onWheel={onWheel} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div style={{ width: width + HEADER_W, position: 'relative' }}>
          <div className="ruler" style={{ paddingLeft: HEADER_W }} onPointerDown={scrub}>
            {ticks.map((t) => (
              <span key={t} className="tick" style={{ left: HEADER_W + t * pxPerSec }}>
                {t >= 60 ? `${Math.floor(t / 60)}m${t % 60 ? (t % 60) + 's' : ''}` : `${t}s`}
              </span>
            ))}
          </div>

          {project.tracks.map((track) => (
            <div key={track.id} className={`track ${track.kind}`} style={{ height: TRACK_H }}>
              <div className="track-header" style={{ width: HEADER_W }}>
                <span>{track.name}</span>
                {track.kind === 'video' && (
                  <button className={track.hidden ? 'off' : ''} onClick={() => useEditor.getState().toggleTrack(track.id, 'hidden')} title="Show/hide">
                    👁
                  </button>
                )}
                <button className={track.muted ? 'off' : ''} onClick={() => useEditor.getState().toggleTrack(track.id, 'muted')} title="Mute">
                  🔊
                </button>
              </div>
              <div className="track-lane" onPointerDown={(e) => { if (!e.shiftKey && !e.ctrlKey && !e.metaKey) useEditor.getState().select(null); scrub(e); }}>
                {project.clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const media = project.media.find((m) => m.id === clip.mediaId);
                    const kfTimes = [...new Set(Object.values(clip.keyframes).flatMap((l) => (l ?? []).map((k) => k.t)))];
                    return (
                      <div
                        key={clip.id}
                        className={`clip ${media?.kind ?? 'text'} ${selectedIds.includes(clip.id) ? 'selected' : ''} ${clip.id === selectedClipId && selectedIds.length > 1 ? 'primary' : ''}`}
                        style={{ left: clip.start * pxPerSec, width: Math.max(4, clip.duration * pxPerSec) }}
                        onPointerDown={(e) => dragClip(e, clip, 'move')}
                      >
                        <div className="handle left" onPointerDown={(e) => dragClip(e, clip, 'left')} />
                        <span className="clip-name">
                          {clip.speedCurve?.length ? <b className="speed-badge">〰 ramp</b> : (clip.speed ?? 1) !== 1 ? <b className="speed-badge">{clip.speed}×</b> : null}
                          {clip.text ? `T  ${clip.text.content}` : media?.name ?? 'Missing media'}
                        </span>
                        {clip.id === selectedClipId &&
                          kfTimes.map((t) => <span key={t} className="kf-diamond" style={{ left: t * pxPerSec }} />)}
                        <div className="handle right" onPointerDown={(e) => dragClip(e, clip, 'right')} />
                      </div>
                    );
                  })}
                {project.clips
                  .filter((c) => c.trackId === track.id && prevAdjacent(project, c))
                  .map((c) => {
                    const tr = effectiveTransition(project, c);
                    return (
                      <button
                        key={`cut-${c.id}`}
                        className={`cut-marker ${tr ? 'has' : ''}`}
                        style={{ left: c.start * pxPerSec, width: tr ? Math.max(14, tr.duration * pxPerSec) : 14 }}
                        title={tr ? `${tr.type} · ${tr.duration.toFixed(2)}s (click to edit)` : 'Add a transition'}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const st = useEditor.getState();
                          st.select(c.id, e.shiftKey || e.ctrlKey || e.metaKey);
                          if (!c.transition) st.setTransition(c.id, { type: 'dissolve', duration: 0.8 });
                        }}
                      >
                        {tr ? '⧓' : '+'}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="playhead" style={{ left: HEADER_W + time * pxPerSec }} />
        </div>
      </div>
    </div>
  );
}
