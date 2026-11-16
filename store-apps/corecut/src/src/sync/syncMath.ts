// Waveform sync math. Pure functions (no DOM), so it runs in a worker and in tests.
//
// How it works, the same idea PluralEyes and Resolve use:
//  1. Turn each recording into an "energy envelope": loudness over time, with the slow
//     level removed so only the changes are left (claps, words, hits). Two different mics
//     hearing the same room produce very similar envelopes even when they sound different.
//  2. Cross-correlate the two envelopes (fast, with an FFT) to find the time shift where
//     they line up best. A coarse 100 Hz pass searches every shift, then a 1 kHz pass
//     refines it to about a millisecond.
//  3. Score how clearly that shift beats every other shift ("peak to sidelobe ratio"),
//     so a guess on two unrelated clips is reported as a failure instead of a wrong sync.

/** Sample rate the audio is decoded at before analysis. Plenty for envelopes. */
export const DECODE_RATE = 8000;
/** Fine envelope rate (1 ms steps). */
export const FINE_RATE = 1000;
/** Coarse envelope rate (10 ms steps) for the full search. */
export const COARSE_RATE = 100;

export interface Features {
  fine: Float32Array;
  coarse: Float32Array;
  /** Seconds of audio analysed. */
  duration: number;
  /** False when the track is (nearly) silent, so it can't be synced. */
  hasSignal: boolean;
}

export interface Match {
  /** Seconds: B's time 0 happens at this time in A (can be negative). */
  offset: number;
  /** Peak to sidelobe ratio. Over ~6 is a confident match. */
  confidence: number;
  /** Pearson correlation of the fine envelopes at the chosen offset, -1..1. */
  r: number;
  /** Seconds where both recordings overlap at that offset. */
  overlap: number;
}

/** Score above which a match is trusted. */
export const MIN_CONFIDENCE = 6;

/** Mix any number of channels down to one. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i];
  const k = 1 / channels.length;
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

/**
 * Energy envelope at FINE_RATE, plus a coarse version at COARSE_RATE.
 * Each value is log energy minus its local (~0.4 s) average, normalised to unit variance.
 */
export function extractFeatures(mono: Float32Array, rate: number): Features {
  const hop = Math.max(1, Math.round(rate / FINE_RATE));
  const win = hop * 4;
  const n = Math.max(0, Math.floor((mono.length - win) / hop) + 1);
  const energy = new Float32Array(n);

  // A light high-pass (first difference) removes rumble and DC so bass hum doesn't dominate.
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const s = i * hop;
    for (let j = s + 1; j < s + win; j++) {
      const d = mono[j] - mono[j - 1];
      sum += d * d;
    }
    energy[i] = sum / win;
    if (energy[i] > peak) peak = energy[i];
  }
  const hasSignal = peak > 1e-9;
  // floor relative to the loudest part so silent stretches don't explode in log space
  const floor = Math.max(peak * 1e-5, 1e-12);
  for (let i = 0; i < n; i++) energy[i] = Math.log(energy[i] + floor);

  const fine = normalise(subtractMovingAverage(energy, Math.round(FINE_RATE * 0.4)));

  const step = FINE_RATE / COARSE_RATE;
  const cn = Math.floor(n / step);
  const coarse = new Float32Array(cn);
  for (let i = 0; i < cn; i++) {
    let s = 0;
    for (let j = 0; j < step; j++) s += fine[i * step + j];
    coarse[i] = s / step;
  }
  return { fine, coarse: normalise(coarse), duration: mono.length / rate, hasSignal };
}

function subtractMovingAverage(x: Float32Array, radius: number): Float32Array {
  const n = x.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + x[i];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - radius);
    const b = Math.min(n, i + radius + 1);
    out[i] = x[i] - (prefix[b] - prefix[a]) / (b - a);
  }
  return out;
}

function normalise(x: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i];
  mean /= x.length || 1;
  let v = 0;
  for (let i = 0; i < x.length; i++) v += (x[i] - mean) ** 2;
  const sd = Math.sqrt(v / (x.length || 1)) || 1;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] - mean) / sd;
  return out;
}

// ---------- FFT ----------

/** In-place iterative radix-2 FFT. `inverse` gives the unscaled inverse. */
function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * Full cross-correlation c[lag] = sum_t a[t + lag] * b[t], for lag in [-(nb-1), na-1].
 * Returned array index i corresponds to lag = i - (nb - 1).
 */
export function crossCorrelate(a: Float32Array, b: Float32Array): Float64Array {
  const na = a.length;
  const nb = b.length;
  const total = na + nb - 1;
  let size = 1;
  while (size < total) size <<= 1;
  const ar = new Float64Array(size);
  const ai = new Float64Array(size);
  const br = new Float64Array(size);
  const bi = new Float64Array(size);
  ar.set(a);
  br.set(b);
  fft(ar, ai);
  fft(br, bi);
  // A * conj(B)
  for (let i = 0; i < size; i++) {
    const r = ar[i] * br[i] + ai[i] * bi[i];
    const im = ai[i] * br[i] - ar[i] * bi[i];
    ar[i] = r;
    ai[i] = im;
  }
  fft(ar, ai, true);
  const out = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    const lag = i - (nb - 1);
    out[i] = ar[(lag + size) % size] / size;
  }
  return out;
}

/** Pearson correlation of a[t + lag] and b[t] over their overlap. */
function pearsonAt(a: Float32Array, b: Float32Array, lag: number) {
  const t0 = Math.max(0, -lag);
  const t1 = Math.min(b.length, a.length - lag);
  const n = t1 - t0;
  if (n < 10) return { r: 0, n: 0 };
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let t = t0; t < t1; t++) {
    const x = a[t + lag];
    const y = b[t];
    sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
  }
  const cov = sab - (sa * sb) / n;
  const va = saa - (sa * sa) / n;
  const vb = sbb - (sb * sb) / n;
  return { r: va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0, n };
}

/** Minimum overlap required for a shift to count, in seconds. */
const MIN_OVERLAP_S = 2;

/** Find where recording B sits inside (or against) recording A. */
export function findOffset(A: Features, B: Features): Match | null {
  if (!A.hasSignal || !B.hasSignal) return null;
  const a = A.coarse;
  const b = B.coarse;
  if (a.length < COARSE_RATE || b.length < COARSE_RATE) return null;
  const xc = crossCorrelate(a, b);
  const nb = b.length;

  // Normalise by overlap so a lag with a tiny overlap can't win by accident,
  // and ignore lags that overlap less than MIN_OVERLAP_S (or half the shorter clip, if shorter).
  const minOverlap = Math.min(MIN_OVERLAP_S * COARSE_RATE, Math.floor(Math.min(a.length, b.length) / 2));
  const score = new Float64Array(xc.length);
  for (let i = 0; i < xc.length; i++) {
    const lag = i - (nb - 1);
    const ov = Math.min(a.length, lag + nb) - Math.max(0, lag);
    score[i] = ov >= minOverlap ? xc[i] / Math.sqrt(ov) : 0;
  }
  let best = 0;
  for (let i = 1; i < score.length; i++) if (score[i] > score[best]) best = i;

  // Peak-to-sidelobe ratio, excluding ±0.5 s around the peak.
  const guard = COARSE_RATE / 2;
  let sum = 0, sq = 0, cnt = 0;
  for (let i = 0; i < score.length; i++) {
    if (Math.abs(i - best) <= guard || score[i] === 0) continue;
    sum += score[i]; sq += score[i] * score[i]; cnt++;
  }
  const mean = cnt ? sum / cnt : 0;
  const sd = cnt ? Math.sqrt(Math.max(1e-12, sq / cnt - mean * mean)) : 1;
  const confidence = (score[best] - mean) / sd;

  // Refine at 1 kHz around the coarse lag (±25 ms) with exact Pearson correlation.
  const ratio = FINE_RATE / COARSE_RATE;
  const coarseLag = best - (nb - 1);
  const center = coarseLag * ratio;
  let bestLag = center;
  let bestR = -Infinity;
  const rs = new Map<number, number>();
  for (let lag = center - 25; lag <= center + 25; lag++) {
    const { r } = pearsonAt(A.fine, B.fine, lag);
    rs.set(lag, r);
    if (r > bestR) { bestR = r; bestLag = lag; }
  }
  // Parabolic interpolation for sub-millisecond precision.
  let frac = 0;
  const l = rs.get(bestLag - 1);
  const rr = rs.get(bestLag + 1);
  if (l !== undefined && rr !== undefined) {
    const den = l - 2 * bestR + rr;
    if (den < 0) frac = Math.max(-0.5, Math.min(0.5, (0.5 * (l - rr)) / den));
  }
  const lagS = (bestLag + frac) / FINE_RATE;
  const overlap = Math.max(0, Math.min(A.duration, lagS + B.duration) - Math.max(0, lagS));
  return { offset: lagS, confidence, r: bestR, overlap };
}
