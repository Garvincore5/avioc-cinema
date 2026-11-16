import { beginGesture } from '../store';

export function Slider({ label, value, min, max, step = 0.01, onChange, extra }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; extra?: React.ReactNode;
}) {
  return (
    <label className="slider">
      <span className="slider-label">{label}{extra}</span>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={beginGesture} onChange={(e) => onChange(+e.target.value)} />
      <input type="number" className="num" step={step} value={+value.toFixed(3)} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="slider">
      <span className="slider-label">{label}</span>
      <input type="color" value={value} onPointerDown={beginGesture} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
