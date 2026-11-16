export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

// W3C "luminosity" blend helper: give colour c the luminance l, keeping it in gamut.
vec3 setLum(vec3 c, float l) {
  c += l - luma(c);
  float L = luma(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = L + (c - L) * L / max(L - n, 1e-4);
  if (x > 1.0) c = L + (c - L) * (1.0 - L) / max(x - L, 1e-4);
  return c;
}

vec3 softLight(vec3 b, vec3 s) {
  vec3 lo = 2.0 * b * s + b * b * (1.0 - 2.0 * s);
  vec3 hi = sqrt(b) * (2.0 * s - 1.0) + 2.0 * b * (1.0 - s);
  return mix(lo, hi, step(0.5, s));
}
`;

export const COPY_FRAG = `${COMMON}
uniform sampler2D uTex;
void main() { outColor = vec4(texture(uTex, vUv).rgb, 1.0); }`;

// 9-tap gaussian using linear sampling; uDir = texel step * spread.
export const BLUR_FRAG = `${COMMON}
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 s = texture(uTex, vUv).rgb * 0.2270270270;
  s += texture(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  s += texture(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  outColor = vec4(s, 1.0);
}`;

export const MAIN_FRAG = `${COMMON}
uniform sampler2D uSrc, uBlurS, uBlurM, uBlurL, uBlurXL, uMaskA, uMaskB, uMaskC, uMaskD, uSeg;
uniform vec2 uTexel;
uniform float uSkinRadius, uHasSeg;
uniform float u_skinDetail, u_blemish, u_shine, u_skinLight, u_skinWarmth;
uniform float u_faceLight, u_contour, u_highlight, u_brows;
uniform float u_bgReplace, u_bgImage, u_bgRemove, u_layerSubject, u_layerBackground;
uniform vec3 u_bgColor;
uniform sampler2D uBgImg, uFg, uProtect;
uniform float uHasProtect, u_eyeWhites;
uniform float u_edgeShift, u_maskSmooth, u_maskFeather, u_maskContrast, u_decontam;
uniform float uMaskView; // 0 normal, 1 overlay, 2 on black, 3 on white, 4 black & white
uniform float uSkinAll; // 0 = only the chosen faces' skin is retouched

float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
uniform float uHasBgImg;
uniform vec2 uBgScale;

// Light & color settings. [0] = whole photo, [1] = subject only, [2] = background only.
struct Dev {
  float exposure, contrast, highlights, shadows, whites, blacks;
  float temperature, tint, vibrance, saturation;
  float texture, clarity, dehaze, sharpen, fade, glow;
  float shadowTintAmt, highlightTintAmt;
  vec3 shadowTint, highlightTint;
};
uniform Dev uDev[3];
uniform float uDevOn[3];
uniform float u_skinSmooth, u_skinTone, u_underEye;
uniform float u_eyeBrighten, u_teethWhiten, u_eyeColorAmt;
uniform vec3 u_eyeColor;
uniform float u_lipstick, u_blush, u_eyeshadow;
uniform vec3 u_lipColor, u_blushColor, u_shadowColor;
uniform float u_hairColorAmt;
uniform vec3 u_hairColor;
uniform float u_bgBlur, u_bgLight, u_bgDesat;

// Edge-preserving blur: smooths blemishes and pores, keeps strong edges.
// tol = how different a neighbour may be and still get averaged in (grows with strength).
vec3 bilateral(vec2 uv, vec3 c0, float radius, float tol) {
  vec3 sum = c0;
  float wsum = 1.0;
  // Tolerance scales with brightness: on deep skin, light-to-shadow differences are small in absolute
  // terms, and a fixed tolerance would flatten the face's natural shading (and lighten the shadow side).
  float l0 = luma(c0);
  tol *= clamp((l0 * l0 + 0.015) * 4.0, 0.1, 1.2);
  for (int ring = 1; ring <= 4; ring++) {
    float r = radius * float(ring) / 4.0;
    for (int k = 0; k < 12; k++) {
      float a = (float(k) + float(ring) * 0.37) * 0.5235988;
      vec3 s = texture(uSrc, uv + vec2(cos(a), sin(a)) * r * uTexel).rgb;
      vec3 d = s - c0;
      float w = exp(-dot(d, d) / tol) * exp(-float(ring * ring) / 18.0);
      sum += s * w;
      wsum += w;
    }
  }
  return sum / wsum;
}

vec3 develop(Dev d, vec3 c, vec3 src, vec3 bS, vec3 bL, float skinM, float skinProt, float featM) {
  // Detail (kept off retouched skin and replaced backgrounds).
  c += (src - bS) * (d.texture * 0.8 + d.sharpen * 1.2) * skinProt;
  c += (c - bL) * d.clarity * 0.7 * max(1.0 - abs(luma(c) - 0.5) * 1.6, 0.0) * skinProt;
  c = clamp(c, 0.0, 1.0);

  float ev = exp2(d.exposure * 2.5);
  vec3 wb = vec3(1.0 + 0.22 * d.temperature, 1.0 - 0.18 * d.tint, 1.0 - 0.22 * d.temperature);
  vec3 p = toSrgb(toLin(c) * ev * wb);
  float L = luma(p);
  float Lloc = mix(L, luma(toSrgb(toLin(bL) * ev * wb)), 0.5);
  float dL = d.highlights * 0.30 * smoothstep(0.45, 1.0, Lloc)
           + d.shadows * 0.30 * (1.0 - smoothstep(0.0, 0.55, Lloc))
           + d.whites * 0.18 * smoothstep(0.65, 1.0, L)
           + d.blacks * 0.12 * (1.0 - smoothstep(0.0, 0.3, L));
  p = clamp(p + dL, 0.0, 1.0);

  if (d.contrast >= 0.0) p = mix(p, p * p * (3.0 - 2.0 * p), d.contrast);
  else p = mix(p, 0.5 + (p - 0.5) * 0.5, -d.contrast);

  if (d.dehaze > 0.0) {
    float h = d.dehaze * 0.15;
    p = (p - h) / (1.0 - h);
    p = mix(vec3(luma(p)), p, 1.0 + d.dehaze * 0.25);
  } else {
    p = mix(p, vec3(0.78), -d.dehaze * 0.4);
  }

  L = luma(p);
  float sat = max(max(p.r, p.g), p.b) - min(min(p.r, p.g), p.b);
  p = mix(vec3(L), p, 1.0 + d.vibrance * (1.0 - sat) * (1.0 - 0.5 * skinM));
  p = mix(vec3(L), p, 1.0 + d.saturation);

  p = clamp(p, 0.0, 1.0);
  float Lg = luma(p);
  p = mix(p, softLight(p, d.shadowTint), d.shadowTintAmt * (1.0 - Lg) * (1.0 - Lg));
  p = mix(p, softLight(p, d.highlightTint), d.highlightTintAmt * Lg * Lg);
  // Glow is kept off eyes, brows, lips and nostrils so they stay crisp.
  // Uses brightness only, so colourful clothes nearby don't bleed onto skin.
  p = 1.0 - (1.0 - p) * (1.0 - vec3(luma(bL)) * d.glow * 0.5 * (1.0 - 0.85 * featM));
  p = mix(p, p * 0.82 + 0.12, d.fade);
  return clamp(p, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec3 src = texture(uSrc, uv).rgb;
  vec3 c = src;
  vec3 bS = texture(uBlurS, uv).rgb;
  vec3 bL = texture(uBlurL, uv).rgb;
  vec3 mA = texture(uMaskA, uv).rgb; // face oval, eye opening, mouth inside
  vec3 mB = texture(uMaskB, uv).rgb; // lips, under-eye, blush
  vec3 mC = texture(uMaskC, uv).rgb; // eyeshadow, iris, protect
  vec3 mD = texture(uMaskD, uv).rgb; // contour, highlight, brows
  vec3 sg = uHasSeg > 0.5 ? texture(uSeg, uv).rgb : vec3(0.0); // person matte, skin, hair
  // Select and Mask "global refinements" (same idea as Photoshop): smooth, feather, contrast, shift edge.
  float m = sg.r;
  float blurAmt = clamp(u_maskSmooth + u_maskFeather, 0.0, 1.0);
  if (uHasSeg > 0.5 && blurAmt > 0.0) {
    float rad = 1.5 + u_maskSmooth * 6.0 + u_maskFeather * 16.0;
    float sum = m;
    for (int k = 0; k < 8; k++) {
      float ang = float(k) * 0.7853982;
      sum += texture(uSeg, uv + vec2(cos(ang), sin(ang)) * rad * uTexel).r;
      sum += texture(uSeg, uv + vec2(cos(ang + 0.39), sin(ang + 0.39)) * rad * 0.5 * uTexel).r;
    }
    m = mix(m, sum / 17.0, blurAmt);
  }
  float ew = max(0.01, 0.5 * (1.0 - 0.96 * u_maskContrast) - 0.3 * u_maskSmooth + 0.4 * u_maskFeather);
  float ec = 0.5 - u_edgeShift * 0.4;
  sg.r = clamp((m - ec) / (2.0 * ew) + 0.5, 0.0, 1.0);
  vec3 bM = texture(uBlurM, uv).rgb;

  // Skin = what the AI calls skin, plus the whole face oval (forehead included) minus hair.
  float segSkin = smoothstep(0.2, 0.7, sg.g);
  float ovalSkin = mA.r * (1.0 - smoothstep(0.3, 0.6, sg.b));
  float skinM = (uHasSeg > 0.5 ? max(segSkin * mix(mA.r, 1.0, uSkinAll), ovalSkin) : mA.r) * (1.0 - mC.b);
  float ueM = mB.g;

  // --- retouch ---
  // Blemishes: small spots darker or redder than the skin around them get replaced by the surroundings.
  // Thresholds are relative to the local skin brightness, so deep skin isn't "fixed" into a lighter tone.
  float Lm = max(luma(bM), 0.04);
  if (u_blemish > 0.0 && skinM > 0.01) {
    float rel = (luma(bM) - luma(bS)) / Lm;
    // Big differences are edges with something bright nearby (earrings, teeth, background), not blemishes.
    float dark = smoothstep(0.08, 0.3, rel) * (1.0 - smoothstep(0.45, 0.8, rel));
    float red = smoothstep(0.03, 0.12, ((bS.r - bS.g) - (bM.r - bM.g)) / Lm * 0.5);
    // Replace with the surrounding colour, but keep this pixel's own brightness mostly.
    vec3 fix = setLum(bM, mix(luma(c), luma(bM), 0.55));
    c = mix(c, fix, skinM * min(1.0, u_blemish * 1.5) * max(dark, red));
  }
  // Shine: bright, washed-out specular patches pulled back toward the skin around them.
  // Only greasy hot-spots: much brighter than the skin around them and washed-out toward white.
  // Natural highlights are what make skin (especially deep skin) look alive, so they're kept.
  if (u_shine > 0.0 && skinM > 0.01) {
    float sat0 = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
    float sh = smoothstep(0.35, 0.8, (luma(c) - luma(bM)) / Lm) * smoothstep(0.35, 0.6, luma(c))
             * (1.0 - smoothstep(0.12, 0.3, sat0 / max(luma(c), 0.05)));
    vec3 matte = setLum(mix(c, bM, 0.5), mix(luma(c), luma(bM), 0.75));
    c = mix(c, matte, skinM * u_shine * sh);
  }

  float a = u_skinSmooth;
  float smoothAmt = clamp(skinM * min(1.0, a * 1.6) + ueM * u_underEye * 0.7, 0.0, 1.0);
  if (smoothAmt > 0.002) {
    float tol = 0.006 + 0.12 * a * a;
    vec3 sm = bilateral(uv, c, uSkinRadius * (0.5 + 2.5 * a), tol);
    sm = mix(sm, setLum(bM, luma(sm)), smoothstep(0.6, 1.0, a) * 0.5);
    sm += (src - bS) * u_skinDetail;
    // A touch of fine grain on smoothed skin, like real pores, so it never looks plastic.
    sm += (hash12(floor(uv / uTexel)) - 0.5) * 0.025 * smoothstep(0.2, 0.9, a) * (1.0 - u_skinDetail) * luma(sm);
    c = mix(c, sm, smoothAmt);
  }
  // Even tone: pull colour toward the nearby skin colour (small blur, so the background never leaks in).
  // Skips strongly coloured spots (her own makeup) and only evens blotchiness.
  if (u_skinTone > 0.0) {
    vec3 even = setLum(mix(bM, c, 0.3), luma(c));
    float makeup = smoothstep(0.05, 0.14, length(c - setLum(bM, luma(c))) / max(luma(c), 0.08) * 0.3);
    c = mix(c, even, skinM * u_skinTone * 0.35 * (1.0 - makeup));
  }
  // Light changes are multiplicative so they keep the skin's own colour (no grey/ashy cast on deep skin).
  // Under-eye: lift dark circles up to the level of the surrounding cheek, never beyond it.
  if (ueM * u_underEye > 0.001) c = setLum(c, mix(luma(c), max(luma(c), luma(bL)), ueM * u_underEye * 0.7));
  c *= 1.0 + skinM * u_skinLight * (u_skinLight > 0.0 ? 0.35 : 0.3);
  c *= 1.0 + skinM * u_skinWarmth * vec3(0.06, 0.0, -0.08);

  // --- sculpt ---
  // Face light is gentle and fades toward the jaw, so the face never looks lighter than the neck.
  c *= 1.0 + mA.r * mA.r * (1.0 - mC.b * 0.5) * u_faceLight * 0.15;
  c *= 1.0 - mD.r * u_contour * 0.22;
  c *= 1.0 + mD.g * u_highlight * 0.25;
  c = mix(c, c * c * 1.1, mD.b * u_brows * 0.8);

  float eyeM = mA.g * u_eyeBrighten;
  if (eyeM > 0.001) {
    // Crisper and a little brighter, multiplicatively, so dark irises stay rich instead of turning grey.
    vec3 e = c * 1.1 + (src - bS) * 1.3;
    float sclera = (1.0 - mC.g) * smoothstep(0.35, 0.65, luma(c));
    e = mix(e, vec3(luma(e)) * 1.05, sclera * 0.6);
    c = mix(c, e, eyeM);
  }
  c = mix(c, setLum(u_eyeColor, luma(c)), mC.g * u_eyeColorAmt * 0.85);

  // Eye whites: the eye opening minus the iris, skipping dark lashes; remove red/yellow and lift.
  float scleraM = mA.g * (1.0 - mC.g) * smoothstep(0.18, 0.45, luma(c)) * u_eyeWhites;
  if (scleraM > 0.001) {
    vec3 w = mix(c, vec3(luma(c)), 0.8);
    w += (1.0 - w) * 0.25;
    c = mix(c, w, scleraM);
  }

  // Teeth: bright, low-red pixels inside the mouth, so gums, lips and tongue are left alone.
  float redness = c.r - max(c.g, c.b);
  float tM = mA.b * smoothstep(0.2, 0.42, luma(c)) * (1.0 - smoothstep(0.06, 0.18, redness)) * u_teethWhiten;
  if (tM > 0.001) {
    vec3 t = mix(c, vec3(luma(c)), 0.8);
    t.b += max(0.0, (t.r + t.g) * 0.5 - t.b) * 0.8; // cancel yellow
    t += (1.0 - t) * 0.18;
    c = mix(c, t, tM);
  }

  // --- makeup & hair ---
  // Lipstick: colour blend that keeps the lips' own light, shine and texture, so it reads as real makeup.
  if (u_lipstick > 0.0) {
    vec3 lip = setLum(u_lipColor, mix(luma(c), luma(u_lipColor), 0.3));
    lip = mix(lip, c, 0.25) + (src - bS) * 0.8;
    c = mix(c, lip, mB.r * u_lipstick * 0.75);
  }
  c = mix(c, softLight(clamp(c, 0.0, 1.0), u_blushColor), mB.b * u_blush * 0.9);
  c = mix(c, c * u_shadowColor, mC.r * u_eyeshadow * 0.7);
  c = mix(c, setLum(u_hairColor, luma(c)), sg.b * uHasSeg * u_hairColorAmt * 0.8);

  // --- background ---
  float person = uHasSeg > 0.5 ? sg.r : 1.0;
  // Where the background was replaced or blurred, the original fine detail must not come back.
  float detailK = 1.0 - (1.0 - person) * clamp(u_bgBlur * 2.0 + u_bgReplace + u_bgImage * uHasBgImg, 0.0, 1.0);
  if (uHasSeg > 0.5) {
    vec3 bXL = texture(uBlurXL, uv).rgb;
    vec3 bg = mix(c, bL, smoothstep(0.0, 0.4, u_bgBlur));
    bg = mix(bg, bXL, smoothstep(0.4, 1.0, u_bgBlur));
    bg *= 1.0 + u_bgLight * 0.6;
    bg = mix(bg, vec3(luma(bg)), u_bgDesat);
    bg = mix(bg, u_bgColor, u_bgReplace);
    bg = mix(bg, texture(uBgImg, (uv - 0.5) * uBgScale + 0.5).rgb, u_bgImage * uHasBgImg);
    // When the background changes, strip the old background's colour out of the hair/edge pixels.
    float bgChanged = clamp(u_bgBlur * 3.0 + u_bgReplace + u_bgImage * uHasBgImg + u_bgRemove + (1.0 - u_layerBackground)
      + abs(u_bgLight) * 2.0 + u_bgDesat + uDevOn[2], 0.0, 1.0);
    c += (texture(uFg, uv).rgb - src) * max(bgChanged, step(1.5, uMaskView)) * u_decontam;
    c = mix(bg, c, person);
  }

  // --- develop: whole photo, then subject-only and background-only adjustments on top ---
  float skinProt = (1.0 - clamp(skinM * a * 1.5, 0.0, 1.0)) * detailK;
  float featM = mC.b;
  vec3 p = develop(uDev[0], clamp(c, 0.0, 1.0), src, bS, bL, skinM, skinProt, featM);
  if (uHasSeg > 0.5 && (uDevOn[1] > 0.5 || uDevOn[2] > 0.5)) {
    vec3 ps = uDevOn[1] > 0.5 ? develop(uDev[1], p, src, bS, bL, skinM, skinProt, featM) : p;
    vec3 pb = uDevOn[2] > 0.5 ? develop(uDev[2], p, src, bS, bL, skinM, skinProt, featM) : p;
    p = mix(pb, ps, person);
  }

  // Subject / background as separate layers, each with its own opacity.
  float alpha = person * u_layerSubject + (1.0 - person) * u_layerBackground * (1.0 - u_bgRemove);
  // Select and Mask view modes.
  if (uMaskView > 0.5) {
    vec3 v;
    if (uMaskView < 1.5) v = mix(p, vec3(1.0, 0.12, 0.27), (1.0 - person) * 0.55);
    else if (uMaskView < 2.5) v = p * person;
    else if (uMaskView < 3.5) v = mix(vec3(1.0), p, person);
    else v = vec3(person);
    outColor = vec4(v, 1.0);
    return;
  }

  // Hand-painted protected areas keep the original photo.
  float prot = uHasProtect > 0.5 ? texture(uProtect, uv).r : 0.0;
  outColor = vec4(mix(p, src, prot), mix(alpha, 1.0, prot));
}`;

export const MAX_WARPS = 64;

// Inverse-mapped local warps: type 0 = translate (Gustafsson), type 1 = scale (bulge/pinch).
export const WARP_FRAG = `${COMMON}
uniform sampler2D uTex, uDisp, uPerson, uPlate, uRows, uBgImg;
uniform vec2 uSize, uBgScale;
uniform int uCount;
uniform float uHasDisp, uPersonOnly, uHasBgImg, uBodyTop;
uniform float u_bodySlim, u_bgReplace, u_bgImage, u_bgRemove, u_layerBackground;
uniform vec3 u_bgColor;
uniform vec4 uW[${MAX_WARPS}];
uniform vec4 uV[${MAX_WARPS}];
void main() {
  vec2 x = vUv * uSize;
  if (uHasDisp > 0.5) x -= texture(uDisp, vUv).rg * uSize; // hand-painted liquify moves everything
  vec2 xl = x;

  // Slim body: squeeze each row of the person toward its own centre (below the face only).
  if (u_bodySlim != 0.0 && uPersonOnly > 0.5) {
    vec2 rows = texture(uRows, vec2(0.5, xl.y / uSize.y)).rg;
    if (rows.x >= 0.0) {
      float cx = (rows.x + rows.y) * 0.5 * uSize.x;
      float wgt = uBodyTop > 0.0 ? 1.0 - smoothstep(uBodyTop - 0.06, uBodyTop, xl.y / uSize.y) : 1.0;
      x.x = cx + (x.x - cx) * (1.0 + u_bodySlim * 0.16 * wgt);
    }
  }

  // Face-shape warps with a smooth (C2) falloff, so there are no visible circle edges.
  for (int i = 0; i < ${MAX_WARPS}; i++) {
    if (i >= uCount) break;
    vec2 c = uW[i].xy;
    float r = uW[i].z;
    vec2 d = x - c;
    float s = dot(d, d) / (r * r);
    if (s >= 1.0) continue;
    float t = 1.0 - s;
    if (uW[i].w < 0.5) x -= uV[i].xy * t * t * t;
    else x = c + d * (1.0 - uV[i].x * t * t);
  }

  vec4 moved = texture(uTex, x / uSize);
  if (uPersonOnly > 0.5) {
    // Only the person moves. Where they used to be, show the filled-in background, not a stretch.
    float pw = texture(uPerson, x / uSize).r;
    // Even faint hair strands count as "person was here", or they'd linger as see-through ghosts.
    float p0 = smoothstep(0.02, 0.25, texture(uPerson, xl / uSize).r);
    vec4 here = texture(uTex, xl / uSize);
    vec3 fill = texture(uPlate, xl / uSize).rgb;
    fill = mix(fill, u_bgColor, u_bgReplace);
    fill = mix(fill, texture(uBgImg, (xl / uSize - 0.5) * uBgScale + 0.5).rgb, u_bgImage * uHasBgImg);
    vec4 bgHere = mix(here, vec4(fill, (1.0 - u_bgRemove) * u_layerBackground), p0);
    outColor = mix(bgHere, moved, pw);
  } else {
    outColor = moved;
  }
}`;

export const OUTPUT_FRAG = `${COMMON}
uniform sampler2D uTex, uOrig;
uniform float uSplit, uShowOriginal, uAspect, uLineW;
uniform float u_vignette, u_grain;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  bool orig = uShowOriginal > 0.5 || (uSplit >= 0.0 && vUv.x < uSplit);
  vec3 p;
  float alpha = 1.0;
  if (orig) {
    p = texture(uOrig, vUv).rgb;
  } else {
    vec4 t = texture(uTex, vUv);
    p = t.rgb;
    alpha = t.a;
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = length(q) / length(vec2(uAspect, 1.0) * 0.5);
    float w = smoothstep(0.35, 1.0, d);
    if (u_vignette < 0.0) p *= 1.0 + u_vignette * w * 0.9;
    else p += (1.0 - p) * u_vignette * w * 0.8;
    if (u_grain > 0.0) {
      float n = hash(mod(gl_FragCoord.xy, 1024.0)) - 0.5;
      p += n * u_grain * 0.14 * (1.0 - abs(luma(p) - 0.5));
    }
  }
  if (uSplit >= 0.0 && abs(vUv.x - uSplit) < uLineW) { p = vec3(1.0); alpha = 1.0; }
  outColor = vec4(clamp(p, 0.0, 1.0), alpha);
}`;
