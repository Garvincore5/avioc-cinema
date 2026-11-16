import { beginGesture } from '../store';

type RGB = [number, number, number];
const RANGE = 0.5; // max per-channel offset at the wheel's edge

/** Split an RGB offset into a hue/sat puck (x, y in -1..1) and a master (luma) value. */
const decompose = ([r, g, b]: RGB) => {
  const master = (r + g + b) / 3;
  const x = (r - (g + b) / 2) / (0.75 * 2 * RANGE);
  const y = (g - b) / ((Math.sqrt(3) / 2) * 2 * RANGE);
  return { x, y, master };
};
const compose = (x: number, y: number, master: number): RGB => {
  const rad = Math.min(1, Math.hypot(x, y));
  const th = Math.atan2(y, x);
  const a = rad * RANGE;
  return [master + a * Math.cos(th), master + a * Math.cos(th - (2 * Math.PI) / 3), master + a * Math.cos(th + (2 * Math.PI) / 3)];
};

export function ColorWheel({ label, value, onChange }: { label: string; value: RGB; onChange: (v: RGB, record: boolean) => void }) {
  const { x, y, master } = decompose(value);

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    beginGesture();
    const set = (cx: number, cy: number) => {
      let nx = ((cx - rect.left) / rect.width) * 2 - 1;
      let ny = ((cy - rect.top) / rect.height) * 2 - 1;
      const r = Math.hypot(nx, ny);
      if (r > 1) { nx /= r; ny /= r; }
      onChange(compose(nx, ny, master), false);
    };
    set(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => set(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="wheel">
      <div className="wheel-label">
        {label}
        <button className="link" onClick={() => onChange([0, 0, 0], true)}>reset</button>
      </div>
      <div className="wheel-disc" onPointerDown={drag}>
        <div className="wheel-puck" style={{ left: `${50 + x * 50}%`, top: `${50 + y * 50}%` }} />
      </div>
      <input
        type="range" min={-0.5} max={0.5} step={0.005} value={master}
        onPointerDown={beginGesture}
        onChange={(e) => onChange(compose(x, y, +e.target.value), false)}
        title="Master"
      />
    </div>
  );
}
