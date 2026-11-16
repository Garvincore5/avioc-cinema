export const formatTime = (t: number, fps: number) => {
  const total = Math.max(0, t);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const f = Math.floor((total % 1) * fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(m)}:${p(s)}:${p(f)}`;
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
