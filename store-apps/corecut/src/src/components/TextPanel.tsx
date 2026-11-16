import { beginGesture, useEditor } from '../store';
import type { Clip, TextStyle } from '../types';
import { FONTS, TEXT_ANIMS, TEXT_STYLES, defaultText, fontFamily } from '../engine/text';
import { Slider, ColorField } from './Slider';

/** Full text settings for a title clip. Changes apply to every selected text clip. */
export function TextPanel({ clip }: { clip: Clip }) {
  const t = { ...defaultText(), animIn: 'none' as const, animOut: 'none' as const, ...clip.text! };

  const set = (patch: Partial<TextStyle>, record = false) => {
    const st = useEditor.getState();
    const ids = st.selectedIds.includes(clip.id) ? st.selectedIds : [clip.id];
    const apply = (p: typeof st.project) => ({
      ...p,
      // the text content itself only changes on the clip being edited
      clips: p.clips.map((c) => (ids.includes(c.id) && c.text ? { ...c, text: { ...c.text, ...(c.id === clip.id ? patch : withoutContent(patch)) } } : c)),
    });
    if (record) st.commit(apply);
    else useEditor.setState((s) => ({ project: apply(s.project) }));
  };

  return (
    <div className="panel">
      <section>
        <h4>Text</h4>
        <textarea value={t.content} onFocus={beginGesture} onChange={(e) => set({ content: e.target.value })} rows={3} />
      </section>

      <section>
        <h4>Styles</h4>
        <div className="presets">
          {TEXT_STYLES.map((s) => (
            <button key={s.name} className="preset text-style" style={{ fontFamily: fontFamily(s.style.font), fontWeight: s.style.weight }} onClick={() => set(s.style, true)}>
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>Font</h4>
        <select value={t.font} onChange={(e) => set({ font: e.target.value }, true)} style={{ fontFamily: fontFamily(t.font) }}>
          {FONTS.map((f) => <option key={f.name} value={f.name} style={{ fontFamily: f.family }}>{f.name}</option>)}
        </select>
        <div className="seg">
          {[300, 400, 600, 700, 800, 900].map((w) => (
            <button key={w} className={t.weight === w ? 'on' : ''} onClick={() => set({ weight: w }, true)} style={{ fontWeight: w }}>{w}</button>
          ))}
        </div>
        <div className="seg">
          <button className={t.italic ? 'on' : ''} onClick={() => set({ italic: !t.italic }, true)}><i>I</i></button>
          <button className={t.underline ? 'on' : ''} onClick={() => set({ underline: !t.underline }, true)}><u>U</u></button>
          <button className={t.uppercase ? 'on' : ''} onClick={() => set({ uppercase: !t.uppercase }, true)}>AA</button>
          {(['left', 'center', 'right'] as const).map((a) => (
            <button key={a} className={t.align === a ? 'on' : ''} onClick={() => set({ align: a }, true)} title={`Align ${a}`}>
              {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
            </button>
          ))}
        </div>
        <Slider label="Size" min={12} max={400} step={1} value={t.size} onChange={(v) => set({ size: v })} />
        <ColorField label="Color" value={t.color} onChange={(v) => set({ color: v })} />
        <Slider label="Letter spacing" min={-10} max={60} step={0.5} value={t.letterSpacing ?? 0} onChange={(v) => set({ letterSpacing: v })} />
        <Slider label="Line height" min={0.7} max={3} step={0.05} value={t.lineHeight ?? 1.2} onChange={(v) => set({ lineHeight: v })} />
      </section>

      <section>
        <h4>Outline</h4>
        <Slider label="Width" min={0} max={30} step={0.5} value={t.strokeWidth ?? 0} onChange={(v) => set({ strokeWidth: v })} />
        <ColorField label="Color" value={t.strokeColor ?? '#000000'} onChange={(v) => set({ strokeColor: v })} />
      </section>

      <section>
        <h4>Shadow / glow</h4>
        <Slider label="Blur" min={0} max={80} step={1} value={t.shadowBlur ?? 0} onChange={(v) => set({ shadowBlur: v })} />
        <div className="grid2">
          <Slider label="X" min={-40} max={40} step={1} value={t.shadowX ?? 0} onChange={(v) => set({ shadowX: v })} />
          <Slider label="Y" min={-40} max={40} step={1} value={t.shadowY ?? 0} onChange={(v) => set({ shadowY: v })} />
        </div>
        <ColorField label="Color" value={t.shadowColor ?? '#000000'} onChange={(v) => set({ shadowColor: v })} />
      </section>

      <section>
        <h4>Background box</h4>
        <Slider label="Opacity" min={0} max={1} step={0.01} value={t.bgOpacity ?? 0} onChange={(v) => set({ bgOpacity: v })} />
        <ColorField label="Color" value={t.bgColor ?? '#000000'} onChange={(v) => set({ bgColor: v })} />
        <div className="grid2">
          <Slider label="Padding" min={0} max={120} step={1} value={t.bgPadding ?? 20} onChange={(v) => set({ bgPadding: v })} />
          <Slider label="Corners" min={0} max={100} step={1} value={t.bgRadius ?? 0} onChange={(v) => set({ bgRadius: v })} />
        </div>
      </section>

      <section>
        <h4>Animation</h4>
        <label className="slider">
          <span className="slider-label">In</span>
          <select value={t.animIn ?? 'none'} onChange={(e) => set({ animIn: e.target.value as TextStyle['animIn'] }, true)}>
            {TEXT_ANIMS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="slider">
          <span className="slider-label">Out</span>
          <select value={t.animOut ?? 'none'} onChange={(e) => set({ animOut: e.target.value as TextStyle['animOut'] }, true)}>
            {TEXT_ANIMS.filter((a) => a.value !== 'typewriter').map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <Slider label="Duration (s)" min={0.1} max={3} step={0.05} value={t.animDuration ?? 0.4} onChange={(v) => set({ animDuration: v })} />
        <p className="dim small">Move, scale or rotate the title, and keyframe it, in the Edit tab.</p>
      </section>
    </div>
  );
}

const withoutContent = (p: Partial<TextStyle>) => {
  const rest = { ...p };
  delete rest.content;
  return rest;
};
