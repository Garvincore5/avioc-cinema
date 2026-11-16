import { useState } from 'react';
import { useEditor } from '../store';
import type { Clip, CurvePoint, Curves, Project } from '../types';
import { identityCurve, neutralCurves } from '../types';
import { CurveEditor } from './CurveEditor';
import { Slider, ColorField } from './Slider';
import { CURVE_PRESETS, evalCurve } from '../engine/curves';
import { MAX_SPEED, MIN_SPEED, SPEED_PRESETS, speedAt } from '../engine/speed';

/** Patch every selected clip (live = no undo step per tick; beginGesture covers drags). */
const patchSelected = (fn: (c: Clip) => Partial<Clip>, record: boolean) => {
  const st = useEditor.getState();
  const ids = st.selectedIds.length ? st.selectedIds : st.selectedClipId ? [st.selectedClipId] : [];
  const apply = (p: Project) => ({ ...p, clips: p.clips.map((c) => (ids.includes(c.id) ? { ...c, ...fn(c) } : c)) });
  if (record) st.commit(apply);
  else useEditor.setState((s) => ({ project: apply(s.project) }));
};

// ---------- Curves ----------

const CHANNELS: { key: keyof Curves; label: string; color: string }[] = [
  { key: 'master', label: 'RGB', color: '#e7e8ec' },
  { key: 'r', label: 'Red', color: '#ff5d5d' },
  { key: 'g', label: 'Green', color: '#4fd27a' },
  { key: 'b', label: 'Blue', color: '#5d8bff' },
  { key: 'luma', label: 'Light', color: '#ffd84a' },
];

export function CurvesSection({ clip }: { clip: Clip }) {
  const [ch, setCh] = useState<keyof Curves>('master');
  const curves = clip.curves ?? neutralCurves();
  const pts = curves[ch];
  const chan = CHANNELS.find((c) => c.key === ch)!;
  const setPts = (p: CurvePoint[], record: boolean) =>
    patchSelected((c) => ({ curves: { ...(c.curves ?? neutralCurves()), [ch]: p } }), record);

  return (
    <section>
      <h4>Curves</h4>
      <div className="seg">
        {CHANNELS.map((c) => (
          <button key={c.key} className={ch === c.key ? 'on' : ''} onClick={() => setCh(c.key)} style={{ color: ch === c.key ? undefined : c.color }}>
            {c.label}
          </button>
        ))}
      </div>
      <CurveEditor points={pts} onChange={setPts} sample={(x) => evalCurve(pts, x)} color={chan.color} />
      <p className="dim small">
        {ch === 'luma' ? 'Light curve changes brightness only, keeping colors.' : 'Click to add a point, drag to shape, double-click to remove.'}
      </p>
      <div className="presets">
        {CURVE_PRESETS.map((p) => (
          <button key={p.name} className="preset" onClick={() => patchSelected(() => ({ curves: { ...neutralCurves(), ...p.curves } }), true)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="row-btns">
        <button onClick={() => setPts(identityCurve(), true)}>Reset {chan.label}</button>
        <button onClick={() => patchSelected(() => ({ curves: undefined }), true)}>Reset all curves</button>
      </div>
    </section>
  );
}

// ---------- Speed ----------

const toY = (v: number) => Math.log(v / MIN_SPEED) / Math.log(MAX_SPEED / MIN_SPEED);
const fromY = (y: number) => +(MIN_SPEED * Math.pow(MAX_SPEED / MIN_SPEED, y)).toFixed(2);

export function SpeedSection({ clip }: { clip: Clip }) {
  const st = useEditor.getState();
  const ramp = !!clip.speedCurve?.length;
  const [mode, setMode] = useState<'normal' | 'curve'>(ramp ? 'curve' : 'normal');
  const speed = clip.speed ?? 1;

  return (
    <section>
      <h4>Speed</h4>
      <div className="seg">
        <button className={mode === 'normal' ? 'on' : ''} onClick={() => { setMode('normal'); if (ramp) st.setSpeedCurve(clip.id, undefined); }}>Constant</button>
        <button className={mode === 'curve' ? 'on' : ''} onClick={() => setMode('curve')}>Curve</button>
      </div>
      {mode === 'normal' ? (
        <>
          <Slider label={`Speed ${speed.toFixed(2)}×`} min={MIN_SPEED} max={MAX_SPEED} step={0.05} value={speed} onChange={(v) => st.setSpeed(Math.max(MIN_SPEED, v))} />
          <div className="btn-grid">
            {[0.25, 0.5, 1, 1.5, 2, 4].map((v) => (
              <button key={v} className={Math.abs(speed - v) < 0.001 && !ramp ? 'on' : ''} onClick={() => st.setSpeed(v)}>{v}×</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="presets">
            {SPEED_PRESETS.map((p) => (
              <button key={p.name} className="preset" onClick={() => st.setSpeedCurve(clip.id, p.curve)}>{p.name}</button>
            ))}
          </div>
          <CurveEditor
            points={clip.speedCurve ?? [[0, speed], [1, speed]]}
            onChange={(p, r) => st.setSpeedCurve(clip.id, p, r)}
            sample={(x) => speedAt(clip.speedCurve ? clip : { ...clip, speedCurve: [[0, speed], [1, speed]] }, x * clip.duration)}
            valueToY={toY} yToValue={fromY} color="#ffcf4a" height={140}
            guides={[{ y: toY(1), label: '1×' }, { y: toY(4), label: '4×' }, { y: toY(0.25), label: '0.25×' }]}
          />
          <p className="dim small">Fast parts make the clip shorter, slow parts longer; clips after it move to fit.</p>
        </>
      )}
      <p className="dim small">Sound follows the speed (pitch kept in preview).</p>
    </section>
  );
}

// ---------- Picture-in-picture, crop and frame ----------

export function PipSection({ clip }: { clip: Clip }) {
  const st = useEditor.getState();
  const isPip = useEditor((s) => s.project.tracks.find((t) => t.id === clip.trackId)?.name.startsWith('PiP'));
  const crop = clip.crop ?? { l: 0, r: 0, t: 0, b: 0 };
  const frame = clip.frame ?? { border: 0, borderColor: '#ffffff', radius: 0, shadow: 0 };
  const setCrop = (k: keyof typeof crop, v: number) => patchSelected((c) => ({ crop: { ...(c.crop ?? { l: 0, r: 0, t: 0, b: 0 }), [k]: Math.min(0.45, Math.max(0, v)) } }), false);
  const setFrame = (k: keyof typeof frame, v: number | string) => patchSelected((c) => ({ frame: { ...(c.frame ?? { border: 0, borderColor: '#ffffff', radius: 0, shadow: 0 }), [k]: v } }), false);

  return (
    <section>
      <h4>Picture-in-picture</h4>
      {!isPip && (
        <button className="primary" onClick={() => st.makePip()} title="Moves the clip to its own layer on top and shrinks it into a corner">
          ⧉ Make picture-in-picture
        </button>
      )}
      <div className="btn-grid">
        <button onClick={() => st.pipCorner('tl')}>↖ Top left</button>
        <button onClick={() => st.pipCorner('center')}>• Center</button>
        <button onClick={() => st.pipCorner('tr')}>↗ Top right</button>
        <button onClick={() => st.pipCorner('bl')}>↙ Bottom left</button>
        <button onClick={() => patchSelected((c) => ({ transform: { ...c.transform, scale: 1, x: 0, y: 0 }, frame: undefined, crop: undefined }), true)}>Full frame</button>
        <button onClick={() => st.pipCorner('br')}>↘ Bottom right</button>
      </div>
      <Slider label="Size" min={0.1} max={1} step={0.01} value={clip.transform.scale} onChange={(v) => patchSelected((c) => ({ transform: { ...c.transform, scale: v } }), false)} />
      <div className="sub-h">Crop</div>
      <div className="grid2">
        <Slider label="Left" min={0} max={0.45} value={crop.l} onChange={(v) => setCrop('l', v)} />
        <Slider label="Right" min={0} max={0.45} value={crop.r} onChange={(v) => setCrop('r', v)} />
        <Slider label="Top" min={0} max={0.45} value={crop.t} onChange={(v) => setCrop('t', v)} />
        <Slider label="Bottom" min={0} max={0.45} value={crop.b} onChange={(v) => setCrop('b', v)} />
      </div>
      <div className="sub-h">Frame</div>
      <Slider label="Border" min={0} max={40} step={1} value={frame.border} onChange={(v) => setFrame('border', v)} />
      <ColorField label="Border color" value={frame.borderColor} onChange={(v) => setFrame('borderColor', v)} />
      <Slider label="Rounded corners" min={0} max={300} step={1} value={frame.radius} onChange={(v) => setFrame('radius', v)} />
      <Slider label="Shadow" min={0} max={120} step={1} value={frame.shadow} onChange={(v) => setFrame('shadow', v)} />
    </section>
  );
}
