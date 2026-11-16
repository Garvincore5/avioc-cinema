import { useState } from 'react';
import { useEditor } from '../store';
import type { AnimProp, Clip, ColorGrade, TransitionType } from '../types';
import { neutralGrade, TRANSITIONS } from '../types';
import { prevAdjacent } from '../engine/transitions';
import { BUILT_IN_PRESETS, addPreset, deletePreset, renamePreset, useUserPresets, type ColorPreset } from '../presets';
import { sampleKeyframes } from '../engine/keyframes';
import { ColorWheel } from './ColorWheel';
import { Slider } from './Slider';
import { TextPanel } from './TextPanel';
import { CurvesSection, PipSection, SpeedSection } from './ClipPanels';

const PROPS: { key: AnimProp; label: string; min: number; max: number; step: number }[] = [
  { key: 'x', label: 'Position X', min: -1920, max: 1920, step: 1 },
  { key: 'y', label: 'Position Y', min: -1080, max: 1080, step: 1 },
  { key: 'scale', label: 'Scale', min: 0.05, max: 4, step: 0.01 },
  { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 0.5 },
  { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01 },
];

const GRADE: { key: keyof ColorGrade; label: string; min: number; max: number }[] = [
  { key: 'exposure', label: 'Exposure', min: -3, max: 3 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 2 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2 },
  { key: 'temperature', label: 'Temperature', min: -1, max: 1 },
  { key: 'tint', label: 'Tint', min: -1, max: 1 },
];

export function Inspector() {
  const clip = useEditor((s) => s.project.clips.find((c) => c.id === s.selectedClipId));
  const time = useEditor((s) => s.time);
  const count = useEditor((s) => s.selectedIds.length);
  const [tabState, setTab] = useState<'edit' | 'color' | 'text'>('edit');
  const tab = tabState === 'text' && !clip?.text ? 'edit' : tabState;

  if (!clip) return <aside className="inspector empty">Select a clip to edit it.</aside>;

  return (
    <aside className="inspector">
      <div className="tabs">
        {clip.text && <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>Text</button>}
        <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>Edit</button>
        <button className={tab === 'color' ? 'active' : ''} onClick={() => setTab('color')}>Color</button>
      </div>
      {count > 1 && (
        <p className="multi-note">
          <strong>{count} clips selected.</strong> Color, presets, rotate and transitions apply to all of them. Sliders under Transform change the outlined clip.
        </p>
      )}
      {tab === 'text' ? <TextPanel clip={clip} /> : tab === 'edit' ? <EditTab clip={clip} time={time} /> : <ColorTab clip={clip} />}
    </aside>
  );
}

// Live slider changes skip history; beginGesture() on pointerdown records one undo step per drag.
const live = (id: string, patch: Partial<Clip>) => useEditor.getState().updateClip(id, patch, false);

function EditTab({ clip, time }: { clip: Clip; time: number }) {
  const st = useEditor.getState();
  const local = time - clip.start;
  const inRange = local >= 0 && local <= clip.duration;

  const setProp = (prop: AnimProp, v: number) => {
    const kfs = clip.keyframes[prop];
    if (kfs?.length) {
      // keyframed: write/replace a keyframe at the playhead without a history entry per tick
      const next = kfs.filter((k) => Math.abs(k.t - local) > 1 / 120).concat({ t: local, v, easing: 'easeInOut' }).sort((a, b) => a.t - b.t);
      live(clip.id, { keyframes: { ...clip.keyframes, [prop]: next } });
    } else live(clip.id, { transform: { ...clip.transform, [prop]: v } });
  };

  return (
    <div className="panel">
      <TransitionSection clip={clip} />
      {clip.mediaId && <SpeedSection clip={clip} />}
      <PipSection clip={clip} />

      <section>
        <h4>Rotate</h4>
        <div className="btn-grid">
          <button onClick={() => st.rotateSelected('left')} title="Rotate 90° left">↺ 90°</button>
          <button onClick={() => st.rotateSelected('right')} title="Rotate 90° right">↻ 90°</button>
          <button onClick={() => st.rotateSelected('180')}>180°</button>
          <button className={clip.flipH ? 'on' : ''} onClick={() => st.rotateSelected('flipH')}>⇋ Flip H</button>
          <button className={clip.flipV ? 'on' : ''} onClick={() => st.rotateSelected('flipV')}>⇵ Flip V</button>
          <button onClick={() => st.rotateSelected('reset')}>Reset</button>
        </div>
      </section>

      <section>
        <h4>Transform <span className="dim">◆ = keyframe at playhead</span></h4>
        {PROPS.map((p) => {
          const kfs = clip.keyframes[p.key];
          const onKf = !!kfs?.some((k) => Math.abs(k.t - local) < 1 / 60);
          const value = sampleKeyframes(kfs, local, clip.transform[p.key]);
          return (
            <Slider
              key={p.key} label={p.label} min={p.min} max={p.max} step={p.step} value={value}
              onChange={(v) => setProp(p.key, v)}
              extra={
                <button
                  className={`kf-btn ${onKf ? 'on' : kfs?.length ? 'has' : ''}`}
                  disabled={!inRange}
                  title={onKf ? 'Remove keyframe' : 'Add keyframe at playhead'}
                  onClick={(e) => { e.preventDefault(); st.toggleKeyframe(clip.id, p.key); }}
                >◆</button>
              }
            />
          );
        })}
        {Object.values(clip.keyframes).some((l) => l?.length) && (
          <button className="link" onClick={() => st.updateClip(clip.id, { keyframes: {} })}>Clear all keyframes</button>
        )}
      </section>

      <section>
        <h4>Audio & fades</h4>
        <Slider label="Volume" value={clip.volume} min={0} max={2} onChange={(v) => live(clip.id, { volume: v })} />
        <Slider label="Fade in (s)" value={clip.fadeIn} min={0} max={Math.min(5, clip.duration)} onChange={(v) => live(clip.id, { fadeIn: v })} />
        <Slider label="Fade out (s)" value={clip.fadeOut} min={0} max={Math.min(5, clip.duration)} onChange={(v) => live(clip.id, { fadeOut: v })} />
      </section>
    </div>
  );
}

function ColorTab({ clip }: { clip: Clip }) {
  const st = useEditor.getState();
  const g = clip.color;
  // edits go to every selected clip; sliders record one undo step per drag via beginGesture
  const set = (patch: Partial<ColorGrade>, record = false) => st.setColorSelected(patch, record);
  return (
    <div className="panel">
      <Presets clip={clip} />
      <section>
        <h4>Primary</h4>
        {GRADE.map((p) => (
          <Slider key={p.key} label={p.label} min={p.min} max={p.max} value={g[p.key] as number} onChange={(v) => set({ [p.key]: v })} />
        ))}
      </section>
      <section>
        <h4>Lift · Gamma · Gain</h4>
        <div className="wheels">
          <ColorWheel label="Lift" value={g.lift} onChange={(v, r) => set({ lift: v }, r)} />
          <ColorWheel label="Gamma" value={g.gamma} onChange={(v, r) => set({ gamma: v }, r)} />
          <ColorWheel label="Gain" value={g.gain} onChange={(v, r) => set({ gain: v }, r)} />
        </div>
      </section>
      <CurvesSection clip={clip} />
      <button onClick={() => set(neutralGrade(), true)}>Reset grade</button>
      <button onClick={() => copyGrade(clip)}>Copy this grade to every clip</button>
    </div>
  );
}

function Presets({ clip }: { clip: Clip }) {
  const user = useUserPresets();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const apply = (p: ColorPreset) => useEditor.getState().setColorSelected(structuredClone(p.grade));
  const save = () => {
    addPreset(name || `Preset ${user.length + 1}`, clip.color);
    setName('');
  };

  return (
    <section>
      <h4>Presets</h4>
      <div className="presets">
        {BUILT_IN_PRESETS.map((p) => (
          <button key={p.id} className="preset" onClick={() => apply(p)} title="Apply to selected clips">
            <Swatch grade={p.grade} />
            {p.name}
          </button>
        ))}
      </div>
      {user.length > 0 && <h4 className="sub">My presets</h4>}
      <div className="presets">
        {user.map((p) =>
          editing === p.id ? (
            <input
              key={p.id} className="preset-rename" autoFocus defaultValue={p.name}
              onBlur={(e) => { renamePreset(p.id, e.target.value); setEditing(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
            />
          ) : (
            <div key={p.id} className="preset user">
              <button className="preset-apply" onClick={() => apply(p)} title="Apply to selected clips">
                <Swatch grade={p.grade} />
                {p.name}
              </button>
              <button className="icon" onClick={() => setEditing(p.id)} title="Rename">✎</button>
              <button className="icon" onClick={() => confirm(`Delete "${p.name}"?`) && deletePreset(p.id)} title="Delete">✕</button>
            </div>
          ),
        )}
      </div>
      <div className="save-preset">
        <input placeholder="Name this look…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button onClick={save}>Save preset</button>
      </div>
    </section>
  );
}

/** Tiny preview of a grade applied to a fixed gradient (approximation of the shader). */
function Swatch({ grade }: { grade: ColorGrade }) {
  const f = (r: number, g: number, b: number) => {
    let c = [r * (1 + grade.temperature * 0.25), g * (1 + grade.tint * 0.2), b * (1 - grade.temperature * 0.25)];
    c = c.map((v, i) => v * 2 ** grade.exposure * (1 + grade.gain[i]) + grade.lift[i] * (1 - v));
    c = c.map((v) => (v - 0.5) * grade.contrast + 0.5);
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    c = c.map((v) => Math.round(Math.min(1, Math.max(0, l + (v - l) * grade.saturation)) * 255));
    return `rgb(${c.join(',')})`;
  };
  return <span className="swatch" style={{ background: `linear-gradient(90deg, ${f(0.85, 0.55, 0.35)}, ${f(0.3, 0.6, 0.45)}, ${f(0.25, 0.4, 0.75)})` }} />;
}

function TransitionSection({ clip }: { clip: Clip }) {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const prev = prevAdjacent(project, clip);
  if (!prev) {
    return (
      <section>
        <h4>Transition</h4>
        <p className="dim small">Butt this clip up against another one on the same track to add a transition between them.</p>
      </section>
    );
  }
  const tr = clip.transition;
  const setFor = (type: TransitionType | '', duration = tr?.duration ?? 0.8) => {
    const st = useEditor.getState();
    // apply to every selected clip that has a cut in front of it
    const targets = project.clips.filter((c) => selectedIds.includes(c.id) && prevAdjacent(project, c));
    st.commit((p) => ({
      ...p,
      clips: p.clips.map((c) => (targets.some((t) => t.id === c.id) ? { ...c, transition: type ? { type, duration } : undefined } : c)),
    }));
  };
  return (
    <section>
      <h4>Transition in</h4>
      <div className="btn-grid">
        <button className={!tr ? 'on' : ''} onClick={() => setFor('')}>None</button>
        {TRANSITIONS.map((t) => (
          <button key={t.type} className={tr?.type === t.type ? 'on' : ''} onClick={() => setFor(t.type)}>{t.label}</button>
        ))}
      </div>
      {tr && (
        <Slider
          label="Duration (s)" min={0.1} max={3} step={0.05} value={tr.duration}
          onChange={(v) => live(clip.id, { transition: { ...tr, duration: v } })}
        />
      )}
    </section>
  );
}

const copyGrade = (from: Clip) =>
  useEditor.getState().commit((p) => ({ ...p, clips: p.clips.map((c) => (c.mediaId || c.text ? { ...c, color: structuredClone(from.color) } : c)) }));
