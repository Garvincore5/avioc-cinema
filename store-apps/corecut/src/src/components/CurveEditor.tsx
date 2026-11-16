import { useRef } from 'react';
import type { CurvePoint } from '../types';
import { beginGesture } from '../store';

/**
 * Draggable curve. Click empty space to add a point, drag to move, double-click a point to
 * remove it. The first and last points stay pinned to the left and right edges.
 */
export function CurveEditor({
  points, onChange, sample, color = '#e7e8ec', yToValue = (y) => y, valueToY = (v) => v, guides = [], height = 180, label,
}: {
  points: CurvePoint[];
  onChange: (pts: CurvePoint[], record: boolean) => void;
  /** Function drawn as the curve (x 0..1 → value). */
  sample: (x: number) => number;
  color?: string;
  /** Map between stored values and the editor's 0..1 vertical axis (for log scales). */
  yToValue?: (y: number) => number;
  valueToY?: (v: number) => number;
  guides?: { y: number; label: string }[];
  height?: number;
  label?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 260;
  const H = height;
  const sorted = [...points].sort((a, b) => a[0] - b[0]);

  const toPx = (x: number, v: number) => [x * W, (1 - valueToY(v)) * H] as const;
  const fromEvent = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    return [x, yToValue(y)] as CurvePoint;
  };

  const drag = (index: number, start: CurvePoint[]) => {
    beginGesture();
    const isEnd = index === 0 || index === start.length - 1;
    const move = (ev: PointerEvent) => {
      const [x, v] = fromEvent(ev);
      const next = start.map((p) => [...p] as CurvePoint);
      const lo = index > 0 ? next[index - 1][0] + 0.01 : 0;
      const hi = index < next.length - 1 ? next[index + 1][0] - 0.01 : 1;
      next[index] = [isEnd ? next[index][0] : Math.min(hi, Math.max(lo, x)), v];
      onChange(next, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).tagName === 'circle') return;
    const [x, v] = fromEvent(e);
    const next = [...sorted, [x, v] as CurvePoint].sort((a, b) => a[0] - b[0]);
    const idx = next.findIndex((p) => p[0] === x && p[1] === v);
    onChange(next, true);
    drag(idx, next);
  };

  const path = Array.from({ length: 65 }, (_, i) => {
    const x = i / 64;
    const [px, py] = toPx(x, sample(x));
    return `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join('');

  return (
    <div className="curve-editor">
      {label && <div className="curve-label">{label}</div>}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} role="img" aria-label="curve editor">
        {[0.25, 0.5, 0.75].map((g) => (
          <g key={g}>
            <line x1={g * W} x2={g * W} y1={0} y2={H} className="grid" />
            <line y1={g * H} y2={g * H} x1={0} x2={W} className="grid" />
          </g>
        ))}
        {guides.map((g) => (
          <g key={g.label}>
            <line x1={0} x2={W} y1={(1 - g.y) * H} y2={(1 - g.y) * H} className="guide" />
            <text x={4} y={(1 - g.y) * H - 3} className="guide-label">{g.label}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {sorted.map((p, i) => {
          const [cx, cy] = toPx(p[0], p[1]);
          return (
            <circle
              key={i} cx={cx} cy={cy} r={6} fill="#17181d" stroke={color} strokeWidth={2}
              onPointerDown={(e) => { e.stopPropagation(); drag(i, sorted); }}
              onDoubleClick={() => i > 0 && i < sorted.length - 1 && onChange(sorted.filter((_, j) => j !== i), true)}
            />
          );
        })}
      </svg>
    </div>
  );
}
