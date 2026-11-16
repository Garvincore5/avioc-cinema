import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Renderer } from './engine/renderer';
import { bodyTop, computeWarps, skinRadius } from './engine/warps';
import { assignProfile, buildDoc, makePreview, openPhoto, redevelopRaw, type PhotoDoc } from './io/document';
import { RAW_DEFAULTS, type RawDecodeOptions, type RawParams } from './io/raw';
import { PROFILES } from './io/color';
import { batchExport, download, formatFor, outputName, renderFull, type Format } from './io/export';
import { canUseFolders, listPhotos, pickFolder, saveToSimmer } from './io/folders';
import { ACCEPT, fitSize, loadFile, toCanvas } from './io/load';
import {
  BG_QUICK, DEFAULTS, MAGIC, PRESETS, SECTIONS, WHOLE_ONLY, num, scopedKey,
  type PanelGroup, type Scope, type Section, type Settings,
} from './settings';
import { autoSettings } from './tools/auto';
import { heal, undoHeal, type HealUndo } from './tools/heal';
import { LiquifyField } from './tools/liquify';
import { circleMask, pasteRegion, pointInPolygon, polygonBounds, polygonMask, removeObject, type Rect } from './tools/fill';
import {
  ASPECTS, cropCanvas, dragCrop, fitAspect, flipCanvas, rotateCanvas, straightenCanvas, straightenScale,
} from './tools/transform';
import { BLENDS, FONTS, compositeLayers, layerBounds, newLayer, type Clip, type Layer, type LayerType } from './layers';
import { faceThumb, loadFaces, storeFaces, type SavedFace } from './faces';
import {
  drawProtectOverlay, newProtectMask, paintMatte, paintProtect, restoreMatte, snapshotMatte, type MatteUndo,
} from './tools/matteBrush';
import { BROW_A, BROW_B, EYE_A, EYE_B, FOREHEAD, IRIS_A, IRIS_B, LIPS_INNER, LIPS_OUTER, NOSE_LOWER } from './face/landmarks';
import { invertLayerMask, newLayerMask, paintLayerMask } from './layers';
import { refineEdge } from './tools/matteBrush';
import { BEAUTY_LOOKS, faceCrop, lookThumbnails, maleVariant } from './faces';
import { analyze } from './face/detector';
import { buildFaceMasks, buildMasks, defaultFaceOpts, type FaceOpt } from './face/masks';
import { activeFaces } from './io/document';
import { loadModels } from './face/detector';
import type { Pt } from './face/landmarks';

type History =
  | { kind: 'settings'; prev: Settings }
  | { kind: 'pixels'; undo: HealUndo[] }
  | { kind: 'liquify'; prev: LiquifyField | null }
  | { kind: 'layers'; prev: Layer[] }
  | { kind: 'layerMask'; mask: HTMLCanvasElement; prev: ImageData }
  | { kind: 'matte'; undo: MatteUndo }
  | { kind: 'protect'; prev: ImageData | null }
  | { kind: 'doc'; prev: PhotoDoc; liquify: LiquifyField | null };

/** Everything that belongs to one open photo. */
interface Tab {
  id: number;
  doc: PhotoDoc;
  settings: Settings;
  history: History[];
  liquify: LiquifyField | null;
  bgImage: HTMLCanvasElement | null;
  layers: Layer[]; // bottom first
  selLayer: number | null;
  /** The last one-click look applied, so its Amount slider can scale it. */
  look: Look | null;
  dir: FileSystemDirectoryHandle | null; // folder of the original, for saving into its "simmer" subfolder
}

interface Look {
  name: string;
  base: Settings; // values before the look, for the keys it changes
  target: Settings; // values at 100%
  amount: number; // 0..150
}

/** Settings at `amount`% of a look, interpolating only the keys the look changes. */
function blendLook(s: Settings, look: Look): Settings {
  const out = { ...s };
  const t = look.amount / 100;
  for (const k of Object.keys(look.target)) {
    const b = look.base[k], v = look.target[k];
    if (typeof v === 'number' && typeof b === 'number') out[k] = Math.round(b + (v - b) * t);
    else out[k] = t > 0 ? v : b;
  }
  return out;
}

const MASK_VIEWS: { id: number; label: string }[] = [
  { id: 1, label: 'Overlay' },
  { id: 2, label: 'On black' },
  { id: 3, label: 'On white' },
  { id: 4, label: 'Black & white' },
  { id: 0, label: 'Result' },
];

type View = { scale: number; x: number; y: number };
type Tool = 'move' | 'crop' | 'heal' | 'clone' | 'patch' | 'lasso' | 'liquify' | 'mask' | 'protect' | 'brush' | 'eraser' | 'text';
type BrushTool = 'heal' | 'clone' | 'liquify' | 'mask' | 'protect' | 'brush' | 'eraser';
type Drag =
  | { mode: 'pan'; x: number; y: number; vx: number; vy: number }
  | { mode: 'split' }
  | { mode: 'heal'; last: Pt; undo: HealUndo[] }
  | { mode: 'clone'; last: Pt; offset: Pt; undo: HealUndo[] }
  | { mode: 'liquify'; last: Pt; prev: LiquifyField | null }
  | { mode: 'lasso'; pts: Pt[] }
  | { mode: 'patch'; start: Pt }
  | { mode: 'crop'; handle: string; start: Pt; rect0: Rect }
  | { mode: 'paint'; layerId: number; pts: Pt[] }
  | { mode: 'matte'; last: Pt; undo: MatteUndo; how: 'refine' | 'add' | 'subtract' }
  | { mode: 'layerMask'; last: Pt; mask: HTMLCanvasElement; reveal: boolean }
  | { mode: 'protect'; last: Pt; prev: ImageData | null; add: boolean }
  | { mode: 'layer'; layerId: number; start: Pt; x0: number; y0: number };

const TOOL_GROUPS: { title: string; tools: { id: Tool; icon: string; label: string; key: string; tip: string }[] }[] = [
  {
    title: 'View',
    tools: [
      { id: 'move', icon: '✥', label: 'Move', key: 'V', tip: 'Pan and zoom; drag text and image layers' },
      { id: 'crop', icon: '⛶', label: 'Crop', key: 'C', tip: 'Crop, rotate and flip' },
    ],
  },
  {
    title: 'Retouch',
    tools: [
      { id: 'heal', icon: '✚', label: 'Spot heal', key: 'J', tip: 'Click or paint over spots and blemishes' },
      { id: 'clone', icon: '⎘', label: 'Clone', key: 'S', tip: 'Clone stamp / Mend: Alt+click a source, then paint' },
      { id: 'patch', icon: '◩', label: 'Patch', key: 'P', tip: 'Draw around a problem, drag it onto a clean area' },
      { id: 'lasso', icon: '➰', label: 'Lasso', key: 'L', tip: 'Select an object and remove it with AI fill' },
      { id: 'liquify', icon: '≈', label: 'Liquify', key: 'W', tip: 'Drag to push parts of the photo' },
    ],
  },
  {
    title: 'Masks',
    tools: [
      { id: 'mask', icon: '✂', label: 'Mask', key: 'Q', tip: 'Select subject, refine hair edges, smooth/feather/shift the cutout' },
      { id: 'protect', icon: '🛡', label: 'Protect', key: 'K', tip: 'Paint areas that no edits should touch' },
    ],
  },
  {
    title: 'Layers',
    tools: [
      { id: 'brush', icon: '🖌', label: 'Brush', key: 'B', tip: 'Paint on a paint layer' },
      { id: 'eraser', icon: '⌫', label: 'Eraser', key: 'E', tip: 'Erase paint on the selected paint layer' },
      { id: 'text', icon: 'T', label: 'Text', key: 'T', tip: 'Click to add text' },
    ],
  },
];
const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

const HINTS: Partial<Record<Tool, string>> = {
  move: 'Drag to pan, scroll to zoom. Drag text or image layers to move them.',
  heal: 'Click or paint over spots, blemishes and small distractions.',
  clone: 'Alt+click to pick where to copy from, then paint. Mend blends the colors in.',
  patch: 'Draw around the problem, then drag the selection onto a clean area and let go.',
  lasso: 'Draw around something you want gone, then press Remove object (or Delete).',
  liquify: 'Drag to push. A bigger brush gives smoother changes.',
  brush: 'Paints on the selected paint layer (a new one is made if needed).',
  eraser: 'Erases paint on the selected paint layer.',
  text: 'Click on the photo to place text, then edit it in the Layers panel.',
  mask: 'Refine edge: paint over hair to recover strands. Add/Subtract paint the mask; Alt flips. Settings are on the right.',
  protect: 'Green = protected (keeps the original). Paint areas edits should not touch, Alt to erase.',
};

type PanelTab = 'quick' | PanelGroup | 'layers' | 'faces';
const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'quick', label: '✨ Quick' },
  { id: 'face', label: 'Face' },
  { id: 'adjust', label: 'Adjust' },
  { id: 'background', label: 'Backgr.' },
  { id: 'layers', label: 'Layers' },
  { id: 'faces', label: 'Faces' },
];

const SHORTCUTS: [string, string][] = [
  ...ALL_TOOLS.map((t): [string, string] => [t.key, `${t.label} tool`]),
  ['[ / ]', 'Smaller / bigger brush'],
  ['Space + drag', 'Pan (any tool)'],
  ['Scroll', 'Zoom'],
  ['F  ·  Ctrl+0', 'Fit to screen'],
  ['Ctrl+1', '100% zoom'],
  ['\\ (hold)', 'Show before'],
  ['Y', 'Split before/after'],
  ['U', 'Side by side before/after'],
  ['M', 'Magic retouch'],
  ['A', 'Auto tone'],
  ['Shift+F', 'Save face (store this look)'],
  ['Alt+1 … Alt+6', 'Panel tabs'],
  ['PageUp / PageDown', 'Previous / next photo tab'],
  ['Ctrl+O', 'Open photos'],
  ['Ctrl+S', 'Save (into the “simmer” folder)'],
  ['Ctrl+Shift+S', 'Save all tabs'],
  ['Ctrl+Z', 'Undo'],
  ['Delete', 'Remove selected object (lasso)'],
  ['Enter / Esc', 'Apply / cancel crop, clear selection'],
  ['?', 'Show this list'],
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null); // WebGL (hidden)
  const viewRef = useRef<HTMLCanvasElement>(null); // photo + layers, what you see
  const origRef = useRef<HTMLCanvasElement>(null); // "before" for side by side
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const layerImgRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const tab = tabs.find((t) => t.id === activeId) ?? null;
  const doc = tab?.doc ?? null;
  const settings = tab?.settings ?? DEFAULTS;
  const history = tab?.history ?? [];
  const liquify = tab?.liquify ?? null;
  const bgImage = tab?.bgImage ?? null;
  const layers = tab?.layers ?? [];
  const selLayer = layers.find((l) => l.id === tab?.selLayer) ?? null;

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>('move');
  const [brushSizes, setBrushSizes] = useState<Record<BrushTool, number>>({ heal: 14, clone: 24, liquify: 80, mask: 20, protect: 30, brush: 12, eraser: 20 });
  const brushTool = (['heal', 'clone', 'liquify', 'mask', 'protect', 'brush', 'eraser'] as const).find((t) => t === tool);
  const [protectAdd, setProtectAdd] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const [matteMode, setMatteMode] = useState<'refine' | 'add' | 'subtract'>('refine');
  const [maskView, setMaskView] = useState(1);
  const [editMask, setEditMask] = useState(false); // brush paints the selected layer's mask
  const [maskReveal, setMaskReveal] = useState(false); // brush on mask: white (reveal) vs black (hide)
  const [lookThumbs, setLookThumbs] = useState<string[]>([]);
  const [matteSmart, setMatteSmart] = useState(true);
  const [maskVersion, setMaskVersion] = useState(0);
  const brush = brushTool ? brushSizes[brushTool] : 0;
  const [paintColor, setPaintColor] = useState('#ff4d6d');
  const [compare, setCompare] = useState<'none' | 'split' | 'side'>('none');
  const [splitPos, setSplitPos] = useState(0.5);
  const split = compare === 'split' ? splitPos : null;
  const side = compare === 'side';
  const [showOriginal, setShowOriginal] = useState(false);
  const [format, setFormat] = useState<Format>('jpeg');
  const [outProfile, setOutProfile] = useState('srgb'); // colour profile saved files are converted to
  const [panelTab, setPanelTab] = useState<PanelTab>('quick');
  const [scope, setScope] = useState<Scope>('whole');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [version, setVersion] = useState(0); // bumps when the source pixels change
  const [liqVersion, setLiqVersion] = useState(0); // bumps while a liquify stroke edits the field in place
  const [selection, setSelection] = useState<Pt[] | null>(null);
  const [patchOffset, setPatchOffset] = useState<Pt | null>(null);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [aspect, setAspect] = useState<number | 'original' | 0>(0);
  const [straighten, setStraighten] = useState(0); // degrees, previewed live, applied with the button
  const [cloneSrc, setCloneSrc] = useState<Pt | null>(null);
  const [cloneOffset, setCloneOffset] = useState<Pt | null>(null);
  const [mend, setMend] = useState(true);
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>(loadFaces);
  const [showKeys, setShowKeys] = useState(false);
  const spaceDown = useRef(false);

  useEffect(() => storeFaces(savedFaces), [savedFaces]);

  // ---- tab state helpers ----
  const updateTab = (id: number | null, fn: (t: Tab) => Partial<Tab>) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...fn(t) } : t)));
  const update = (fn: (t: Tab) => Partial<Tab>) => updateTab(activeId, fn);
  const setSettings = (v: Settings | ((s: Settings) => Settings)) =>
    update((t) => ({ settings: typeof v === 'function' ? v(t.settings) : v }));
  const pushHistory = (h: History) => update((t) => ({ history: [...t.history.slice(-99), h] }));
  const setLiquify = (l: LiquifyField | null) => update(() => ({ liquify: l }));
  const commit = (next: Settings) => {
    pushHistory({ kind: 'settings', prev: settings });
    setSettings(next);
  };
  const inMaskMode = tool === 'mask';
  const look = tab?.look ?? null;

  /** Applies a one-click look (Magic retouch, presets, faces…) and remembers it for its Amount slider. */
  const applyLook = (name: string, values: Settings) => {
    const target: Settings = {}, base: Settings = {};
    for (const [k, v] of Object.entries(values)) {
      if (settings[k] === v) continue;
      target[k] = v;
      base[k] = settings[k] ?? DEFAULTS[k];
    }
    const l: Look = { name, base, target, amount: 100 };
    pushHistory({ kind: 'settings', prev: settings });
    update(() => ({ look: l, settings: blendLook(settings, l) }));
  };
  const setLookAmount = (amount: number) => {
    if (!look) return;
    const l = { ...look, amount };
    update((t) => ({ look: l, settings: blendLook(t.settings, l) }));
  };
  const setLayers = (fn: (ls: Layer[]) => Layer[], select?: number | null) =>
    update((t) => ({ layers: fn(t.layers), ...(select !== undefined ? { selLayer: select } : {}) }));
  const editLayer = (id: number, patch: Partial<Layer>) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)));
  const saveLayersUndo = () => pushHistory({ kind: 'layers', prev: layers });

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  };

  useEffect(() => {
    try {
      rendererRef.current = new Renderer(canvasRef.current!);
    } catch (e) {
      setError(String(e));
    }
    loadModels(); // warm up the AI models in the background
  }, []);

  const fit = (d: PhotoDoc | null = doc) => {
    const st = stageRef.current;
    if (!d || !st) return;
    const r = st.getBoundingClientRect();
    const width = side ? r.width / 2 : r.width, height = r.height;
    const scale = Math.min(width / d.preview.width, height / d.preview.height) * 0.94;
    setView({ scale, x: (width - d.preview.width * scale) / 2, y: (height - d.preview.height * scale) / 2 });
  };

  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  // New tab, or the photo was cropped/rotated: refit and drop per-photo tool state.
  useEffect(() => {
    requestAnimationFrame(() => fit());
    setSelection(null);
    setCloneSrc(null);
    setCloneOffset(null);
    setCropRect(doc && tool === 'crop' ? { x: 0, y: 0, w: doc.preview.width, h: doc.preview.height } : null);
    // Keyed on the full-res canvas, which only changes on a new photo / crop / rotate. Retouch strokes
    // swap doc.preview every dab, and must NOT refit the view or drop the clone source / selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, doc?.base]);

  // Side by side halves the space, so refit.
  useEffect(() => {
    requestAnimationFrame(() => fit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  // The "before" copy for side-by-side view.
  useEffect(() => {
    const c = origRef.current;
    if (!side || !c || !doc) return;
    c.width = doc.preview.width;
    c.height = doc.preview.height;
    c.getContext('2d')!.drawImage(doc.preview, 0, 0);
  }, [side, doc, version]);

  // Upload a new photo / retouched pixels to the GPU.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !doc) return;
    r.setSource(doc.preview, doc.preview.width, doc.preview.height);
    r.setMasks(doc.masks);
  }, [doc, version]);

  useEffect(() => {
    rendererRef.current?.setDisplacement(liquify && !liquify.isEmpty() ? liquify : null);
  }, [liquify, liqVersion]);

  useEffect(() => {
    rendererRef.current?.setBackgroundImage(bgImage);
  }, [bgImage]);

  useEffect(() => {
    if (doc?.masks.seg && maskVersion) rendererRef.current?.updateMatte(doc.masks.seg, doc.masks.fg);
    rendererRef.current?.setProtect(doc?.protect ?? null);
  }, [maskVersion, doc]);

  // Redraw whenever anything visible changes: GPU render, then layers on top.
  useEffect(() => {
    const r = rendererRef.current;
    const out = viewRef.current;
    if (!r || !doc || !out) return;
    const id = requestAnimationFrame(() => {
      const { width: w, height: h } = doc.preview;
      r.render(settings, {
        showOriginal,
        split: split ?? -1,
        skinRadius: skinRadius(doc.faces, w, h),
        warps: computeWarps(activeFaces(doc), settings, w, h),
        maskView: inMaskMode ? maskView : 0,
        skinAll: doc.faceOpts.every((o) => o.on),
        bodyTop: bodyTop(activeFaces(doc)),
      });
      if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
      const ctx = out.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(canvasRef.current!, 0, 0);
      if (!showOriginal && !(inMaskMode && maskView)) compositeLayers(out, layers, doc.masks.seg);
      if (tool === 'protect' && doc.protect) drawProtectOverlay(out, doc.protect);
      if (showFeatures) drawFeatures(ctx, doc, w, h);
      if ((panelTab === 'face' || panelTab === 'faces') && doc.faces.length > 1) drawFaceNumbers(ctx, doc, w, h);
    });
    return () => cancelAnimationFrame(id);
  }, [doc, settings, showOriginal, split, version, liquify, liqVersion, bgImage, layers, tool, maskVersion, showFeatures, maskView, panelTab]);

  // Live thumbnails of the built-in beauty faces, rendered on this photo.
  useEffect(() => {
    if (!doc || panelTab !== 'faces') return;
    let cancelled = false;
    const t = setTimeout(() => {
      lookThumbnails(doc, BEAUTY_LOOKS, DEFAULTS).then((th) => { if (!cancelled) setLookThumbs(th); }).catch(console.error);
    }, 50);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, panelTab, version]);

  const run = async (label: string, fn: (status: (s: string) => void) => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn(setBusy);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const openFiles = (files: File[], dir: FileSystemDirectoryHandle | null = null) => run('Opening photo…', async (status) => {
    for (const [i, file] of files.entries()) {
      const d = await openPhoto(file, (s) => status(files.length > 1 ? `${s} (${i + 1} of ${files.length})` : s));
      const id = nextId.current++;
      setTabs((ts) => [...ts, { id, doc: d, settings: DEFAULTS, history: [], liquify: null, bgImage: null, layers: [], selLayer: null, look: null, dir }]);
      setActiveId(id);
    }
  });

  const openFolder = async () => {
    const dir = await pickFolder();
    if (!dir) return;
    const files = await listPhotos(dir);
    if (!files.length) return setError(`No photos found in ${dir.name}`);
    openFiles(files, dir);
  };

  const closeTab = (id: number) => {
    const i = tabs.findIndex((t) => t.id === id);
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (id === activeId) setActiveId(rest[Math.min(i, rest.length - 1)]?.id ?? null);
  };

  /** Replaces the photo with a cropped/rotated/flipped version (undoable), re-running face detection. */
  const transformDoc = (label: string, fn: (base: HTMLCanvasElement) => HTMLCanvasElement) => {
    if (!doc) return;
    const id = activeId, prev = doc, prevLiq = liquify;
    run(label, async (status) => {
      // RAW data and the source file no longer match the cropped/rotated pixels, so they're dropped.
      const nd = { ...(await buildDoc(prev.name, fn(prev.base), status)), color: prev.color };
      updateTab(id, (t) => ({ doc: nd, liquify: null, history: [...t.history.slice(-99), { kind: 'doc', prev, liquify: prevLiq }] }));
    });
  };

  const refreshPixels = () => {
    if (!doc) return;
    doc.preview = makePreview(doc.base);
    setVersion((v) => v + 1);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    const rest = history.slice(0, -1);
    if (last.kind === 'settings') update(() => ({ settings: last.prev, history: rest }));
    else if (last.kind === 'liquify') update(() => ({ liquify: last.prev, history: rest }));
    else if (last.kind === 'layers') update(() => ({ layers: last.prev, history: rest }));
    else if (last.kind === 'layerMask') {
      last.mask.getContext('2d')!.putImageData(last.prev, 0, 0);
      setMaskVersion((v) => v + 1);
      update(() => ({ history: rest }));
    }
    else if (last.kind === 'protect') {
      if (doc?.protect) {
        if (last.prev) doc.protect.getContext('2d')!.putImageData(last.prev, 0, 0);
        else doc.protect = undefined;
      }
      setMaskVersion((v) => v + 1);
      update(() => ({ history: rest }));
    }
    else if (last.kind === 'matte') {
      if (doc?.masks.seg) restoreMatte(doc.masks.seg, doc.masks.fg, last.undo);
      setMaskVersion((v) => v + 1);
      update(() => ({ history: rest }));
    }
    else if (last.kind === 'doc') update(() => ({ doc: last.prev, liquify: last.liquify, history: rest }));
    else if (doc) {
      for (const u of [...last.undo].reverse()) undoHeal(doc.base, u);
      refreshPixels();
      update(() => ({ history: rest }));
    }
  };

  const hasFace = !!doc?.faces.length;
  const k = doc ? doc.base.width / doc.preview.width : 1; // preview px -> full-res px
  const toBase = (p: Pt) => ({ x: p.x * k, y: p.y * k });

  const removeSelection = () => {
    if (!doc || !selection) return;
    const sel = selection;
    run('Removing object…', async () => {
      await new Promise((r) => setTimeout(r, 20)); // let the spinner paint
      const u = removeObject(doc.base, sel.map(toBase));
      if (u) {
        refreshPixels();
        pushHistory({ kind: 'pixels', undo: [u] });
      }
      setSelection(null);
    });
  };

  const applyPatch = (offset: Pt) => {
    if (!doc || !selection) return;
    const poly = selection.map(toBase);
    const feather = Math.max(1, Math.round(doc.base.width / 1200));
    const r = polygonBounds(poly, feather * 6, doc.base.width, doc.base.height);
    const u = pasteRegion(doc.base, r, polygonMask(poly, r, feather, feather), offset.x * k, offset.y * k, true);
    if (u) {
      refreshPixels();
      pushHistory({ kind: 'pixels', undo: [u] });
    }
  };

  const aspectValue = (a: number | 'original' | 0) =>
    a === 'original' ? (doc ? doc.preview.width / doc.preview.height : 1) : a || (cropRect ? cropRect.w / cropRect.h : 1);

  const applyCrop = () => {
    if (!cropRect || !doc) return;
    const r = { x: Math.round(cropRect.x * k), y: Math.round(cropRect.y * k), w: Math.round(cropRect.w * k), h: Math.round(cropRect.h * k) };
    transformDoc('Cropping…', (b) => cropCanvas(b, r));
    setTool('move');
  };

  const chooseTool = (t: Tool) => {
    setTool(t);
    setCropRect(t === 'crop' && doc ? fitAspect({ x: 0, y: 0, w: doc.preview.width, h: doc.preview.height }, aspectValue(aspect)) : null);
  };

  // ---- layers ----
  const addLayer = (type: LayerType, extra: Partial<Layer> = {}) => {
    if (!doc) return null;
    saveLayersUndo();
    const l = newLayer(type, extra);
    setLayers((ls) => [...ls, l], l.id);
    setPanelTab('layers');
    return l;
  };

  const addImageLayer = (file: File) => run('Adding image…', async () => {
    const bmp = await loadFile(file);
    const s = fitSize(bmp.width, bmp.height, 2048);
    const img = toCanvas(bmp, s.w, s.h);
    bmp.close();
    addLayer('image', { img, name: file.name } as Partial<Layer>);
  });

  const moveLayer = (id: number, dir: 1 | -1) => {
    const i = layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    saveLayersUndo();
    setLayers((ls) => { const c = [...ls]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  };

  const hitLayer = (p: Pt): Layer | null => {
    if (!doc) return null;
    const { width: W, height: H } = doc.preview;
    for (const l of [...layers].reverse()) {
      if (!l.visible) continue;
      const b = layerBounds(l, W, H);
      if (b && p.x / W >= b.x && p.x / W <= b.x + b.w && p.y / H >= b.y && p.y / H <= b.y + b.h) return l;
    }
    return null;
  };

  // ---- saving ----
  const saveTab = async (t: Tab, askFolder: boolean): Promise<string> => {
    const blob = await renderFull(t.doc, t.settings, format, {
      liquify: t.liquify && !t.liquify.isEmpty() ? t.liquify : null, bgImage: t.bgImage, layers: t.layers, profile: outProfile,
    });
    const name = outputName(t.doc.name, formatFor(t.settings, format));
    let dir = t.dir;
    if (!dir && askFolder && canUseFolders()) {
      flash(`Pick the folder that has “${t.doc.name}” — edits go in its “simmer” subfolder`);
      dir = await pickFolder();
      if (dir) updateTab(t.id, () => ({ dir }));
    }
    if (dir) return saveToSimmer(dir, name, blob);
    download(blob, name);
    return `Downloads/${name}`;
  };

  const exportPhoto = () => tab && run('Saving full resolution…', async () => {
    flash(`Saved to ${await saveTab(tab, true)}`);
  });

  const saveAll = () => run('Saving all…', async (status) => {
    for (const [i, t] of tabs.entries()) {
      status(`Saving ${i + 1} of ${tabs.length}: ${t.doc.name}`);
      await saveTab(t, true);
    }
    flash(`Saved ${tabs.length} photos`);
  });

  const runBatch = async () => {
    if (!canUseFolders()) return batchRef.current?.click();
    const dir = await pickFolder();
    if (!dir) return;
    const files = await listPhotos(dir);
    if (!files.length) return setError(`No photos found in ${dir.name}`);
    run('Batch…', async (status) => {
      const failed = await batchExport(files, settings, format, bgImage, dir, status);
      if (failed.length) setError(`Could not process: ${failed.join(', ')}`);
      else flash(`Saved ${files.length} photos to ${dir.name}/simmer`);
    });
  };

  const chooseBackground = (file: File) => run('Loading background…', async () => {
    const bmp = await loadFile(file);
    const s = fitSize(bmp.width, bmp.height, 2048);
    const c = toCanvas(bmp, s.w, s.h);
    bmp.close();
    pushHistory({ kind: 'settings', prev: settings });
    update((t) => ({ bgImage: c, settings: { ...t.settings, bgImage: 100, bgRemove: 0, bgReplace: 0 } }));
  });

  // ---- saved faces (looks stored with a face thumbnail) ----
  const saveFace = () => {
    if (!doc || !viewRef.current) return;
    const face: SavedFace = {
      id: `${Date.now()}`, name: `Look ${savedFaces.length + 1}`, created: Date.now(),
      thumb: faceThumb(viewRef.current, doc), settings: { ...settings },
    };
    setSavedFaces((f) => [face, ...f]);
    setPanelTab('faces');
    flash(`Saved “${face.name}”. Click it on any photo to apply the same edits.`);
  };
  const applyFace = (f: SavedFace) =>
    applyLook(f.name, { ...DEFAULTS, ...f.settings, layerSubject: settings.layerSubject, layerBackground: settings.layerBackground });

  // ---- face picker (which faces to edit, female/male) ----
  const setFaceOpts = (opts: FaceOpt[]) => {
    if (!doc) return;
    const masks = { ...doc.masks, ...buildFaceMasks(doc.faces, opts, doc.preview.width, doc.preview.height) };
    update(() => ({ doc: { ...doc, faceOpts: opts, masks } }));
  };
  const faceThumbs = useMemo(() => (doc ? doc.faces.map((lm) => faceCrop(doc.preview, lm)) : []), [doc?.faces, doc?.preview]);
  const allMale = !!doc && doc.faceOpts.some((o) => o.on) && doc.faceOpts.filter((o) => o.on).every((o) => o.gender === 'male');
  const applyBeauty = (name: string, values: Settings) =>
    applyLook(name, { ...DEFAULTS, ...(allMale ? maleVariant(values) : values), layerSubject: settings.layerSubject, layerBackground: settings.layerBackground });

  /** Photoshop's "Select Subject": run the AI cutout again from scratch (drops hand-painted mask edits). */
  const selectSubject = () => {
    if (!doc) return;
    const id = activeId, prev = doc;
    run('Selecting subject…', async (status) => {
      const { faces, seg } = await analyze(prev.preview);
      status('Refining hair edges…');
      await new Promise((r) => setTimeout(r, 0));
      const nd: PhotoDoc = { ...prev, faces, hasSeg: !!seg, masks: buildMasks(faces, seg, prev.preview), faceOpts: defaultFaceOpts(faces.length) };
      updateTab(id, (t) => ({ doc: nd, history: [...t.history.slice(-99), { kind: 'doc', prev, liquify: t.liquify }] }));
    });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (e.key === ' ') { spaceDown.current = true; e.preventDefault(); return; }
      if (e.key === '?') return setShowKeys((v) => !v);
      if (ctrl) {
        if (key === 'z') { e.preventDefault(); undo(); }
        else if (key === 's' && e.shiftKey) { e.preventDefault(); if (tabs.length) saveAll(); }
        else if (key === 's') { e.preventDefault(); exportPhoto(); }
        else if (key === 'o') { e.preventDefault(); fileRef.current?.click(); }
        else if (key === '0') { e.preventDefault(); fit(); }
        else if (key === '1') { e.preventDefault(); zoom100(); }
        return;
      }
      if (e.altKey) {
        const i = Number(e.key) - 1;
        if (PANEL_TABS[i]) { e.preventDefault(); setPanelTab(PANEL_TABS[i].id); }
        return;
      }
      if (e.key === 'PageDown' || e.key === 'PageUp') {
        const i = tabs.findIndex((t) => t.id === activeId);
        const next = tabs[(i + (e.key === 'PageDown' ? 1 : -1) + tabs.length) % Math.max(1, tabs.length)];
        if (next) setActiveId(next.id);
        return;
      }
      if (!doc) return;
      if (e.shiftKey && key === 'f') return saveFace();
      const shortcut = ALL_TOOLS.find((t) => t.key.toLowerCase() === key);
      if (shortcut) return chooseTool(shortcut.id);
      if (key === '[' || key === ']') {
        if (brushTool) setBrushSizes((b) => ({ ...b, [brushTool]: Math.max(2, Math.round(b[brushTool] * (key === ']' ? 1.2 : 1 / 1.2))) }));
        return;
      }
      if (key === 'f') fit();
      if (key === 'y') setCompare((c) => (c === 'split' ? 'none' : 'split'));
      if (key === 'u') setCompare((c) => (c === 'side' ? 'none' : 'side'));
      if (key === 'm') applyLook('Magic retouch', MAGIC);
      if (key === 'a') applyLook('Auto tone', autoSettings(doc.preview, hasFace));
      if (e.key === '\\' && !e.repeat) setShowOriginal(true);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) { e.preventDefault(); removeSelection(); }
      if (e.key === 'Escape') { setSelection(null); setShowKeys(false); if (tool === 'crop') chooseTool('move'); }
      if (e.key === 'Enter' && tool === 'crop') applyCrop();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === '\\') setShowOriginal(false);
      if (e.key === ' ') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  // ---- canvas interaction ----
  const drag = useRef<Drag | null>(null);

  /** Pointer position inside the photo pane (in side by side, both halves map onto the same photo). */
  const local = (clientX: number, clientY: number): Pt => {
    const rect = stageRef.current!.getBoundingClientRect();
    let x = clientX - rect.left;
    if (side && x >= rect.width / 2) x -= rect.width / 2;
    return { x, y: clientY - rect.top };
  };
  const toImage = (clientX: number, clientY: number): Pt => {
    const l = local(clientX, clientY);
    return { x: (l.x - view.x) / view.scale, y: (l.y - view.y) / view.scale };
  };
  const toScreen = (p: Pt) => ({ x: view.x + p.x * view.scale, y: view.y + p.y * view.scale });

  const healAt = (p: Pt, undo: HealUndo[]) => {
    if (!doc) return;
    const u = heal(doc.base, p.x * k, p.y * k, (brush / view.scale) * k);
    if (!u) return;
    undo.push(u);
    refreshPixels();
  };

  const cloneAt = (p: Pt, offset: Pt, undo: HealUndo[]) => {
    if (!doc) return;
    const c = toBase(p), rad = (brush / view.scale) * k;
    const r: Rect = { x: Math.max(0, Math.floor(c.x - rad)), y: Math.max(0, Math.floor(c.y - rad)), w: 0, h: 0 };
    r.w = Math.min(doc.base.width, Math.ceil(c.x + rad)) - r.x;
    r.h = Math.min(doc.base.height, Math.ceil(c.y + rad)) - r.y;
    const u = pasteRegion(doc.base, r, circleMask(r, c.x, c.y, rad), offset.x * k, offset.y * k, mend);
    if (!u) return;
    undo.push(u);
    refreshPixels();
  };

  const matteAt = (p: Pt, how: 'refine' | 'add' | 'subtract') => {
    if (!doc?.masks.seg) return;
    const u = p.x / doc.preview.width, v = p.y / doc.preview.height, rad = brush / view.scale / doc.preview.width;
    if (how === 'refine') refineEdge(doc.masks.seg, doc.masks.fg, doc.preview, u, v, rad);
    else paintMatte(doc.masks.seg, doc.masks.fg, doc.preview, u, v, rad, how === 'add', matteSmart);
    setMaskVersion((x) => x + 1);
  };

  const protectAt = (p: Pt, add: boolean) => {
    if (!doc?.protect) return;
    paintProtect(doc.protect, p.x / doc.preview.width, p.y / doc.preview.height, brush / view.scale / doc.preview.width, add);
    setMaskVersion((v) => v + 1);
  };

  const norm = (p: Pt): Pt => (doc ? { x: p.x / doc.preview.width, y: p.y / doc.preview.height } : p);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!doc) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toImage(e.clientX, e.clientY);
    const left = e.button === 0;
    if (!left || spaceDown.current) {
      drag.current = { mode: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    switch (tool) {
      case 'heal': {
        const d: Drag = { mode: 'heal', last: p, undo: [] };
        healAt(p, d.undo);
        drag.current = d;
        return;
      }
      case 'clone': {
        if (e.altKey) {
          setCloneSrc(p);
          setCloneOffset(null);
          return;
        }
        const offset = cloneOffset ?? (cloneSrc && { x: cloneSrc.x - p.x, y: cloneSrc.y - p.y });
        if (!offset) return setError('Alt+click first to pick where to copy from');
        const d: Drag = { mode: 'clone', last: p, offset, undo: [] };
        cloneAt(p, offset, d.undo);
        drag.current = d;
        return;
      }
      case 'liquify':
        drag.current = { mode: 'liquify', last: p, prev: liquify?.clone() ?? null };
        if (!liquify) setLiquify(new LiquifyField(doc.preview.width, doc.preview.height));
        return;
      case 'patch':
      case 'lasso':
        if (tool === 'patch' && selection && pointInPolygon(p, selection)) {
          drag.current = { mode: 'patch', start: p };
          setPatchOffset({ x: 0, y: 0 });
        } else {
          drag.current = { mode: 'lasso', pts: [p] };
          setSelection([p]);
        }
        return;
      case 'brush':
      case 'eraser': {
        if (editMask && selLayer?.mask) {
          // Painting on the layer mask: black hides the layer, white reveals it.
          const mask = selLayer.mask;
          pushHistory({ kind: 'layerMask', mask, prev: mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height) });
          const reveal = tool === 'brush' ? maskReveal : !maskReveal;
          paintLayerMask(mask, norm(p), norm(p), (brush * 2) / view.scale / doc.preview.width, reveal);
          setMaskVersion((x) => x + 1);
          drag.current = { mode: 'layerMask', last: p, mask, reveal };
          return;
        }
        let target: Layer | null = selLayer?.type === 'paint' ? selLayer : null;
        if (!target) {
          if (tool === 'eraser') return setError('Select a paint layer to erase on');
          target = addLayer('paint');
        } else saveLayersUndo();
        if (!target) return;
        const pts = [norm(p)];
        const stroke = { pts, size: brush / view.scale / doc.preview.width * 2, color: paintColor, erase: tool === 'eraser' };
        const id = target.id;
        setLayers((ls) => ls.map((l) => (l.id === id && l.type === 'paint' ? { ...l, strokes: [...l.strokes, stroke] } : l)));
        drag.current = { mode: 'paint', layerId: id, pts };
        return;
      }
      case 'mask': {
        const seg = doc.masks.seg;
        if (!seg) return setError('No person was found in this photo, so there is no cutout to edit');
        // Alt flips add/subtract (like Photoshop's Alt with the Refine Edge / Brush tools).
        const mode = e.altKey ? (matteMode === 'subtract' ? 'add' : 'subtract') : matteMode;
        const d: Drag = { mode: 'matte', last: p, undo: snapshotMatte(seg, doc.masks.fg), how: mode };
        matteAt(p, mode);
        drag.current = d;
        return;
      }
      case 'protect': {
        const prev = doc.protect ? doc.protect.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, doc.protect.width, doc.protect.height) : null;
        doc.protect ??= newProtectMask(doc.preview.width, doc.preview.height);
        const d: Drag = { mode: 'protect', last: p, prev, add: protectAdd !== e.altKey };
        protectAt(p, d.add);
        drag.current = d;
        return;
      }
      case 'text':
        addLayer('text', { x: norm(p).x, y: norm(p).y } as Partial<Layer>);
        chooseTool('move');
        return;
      case 'move': {
        const hit = hitLayer(p);
        if (hit && (hit.type === 'text' || hit.type === 'image')) {
          saveLayersUndo();
          update(() => ({ selLayer: hit.id }));
          drag.current = { mode: 'layer', layerId: hit.id, start: p, x0: hit.x, y0: hit.y };
          return;
        }
        break;
      }
    }
    drag.current = { mode: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    setCursor(local(e.clientX, e.clientY));
    const d = drag.current;
    if (!d || !doc) return;
    const p = toImage(e.clientX, e.clientY);
    const { width: pw, height: ph } = doc.preview;
    const spacing = (brush / view.scale) * 0.4;
    switch (d.mode) {
      case 'split':
        setSplitPos(Math.min(1, Math.max(0, p.x / pw)));
        break;
      case 'heal':
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= spacing) { healAt(p, d.undo); d.last = p; }
        break;
      case 'clone':
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= spacing) { cloneAt(p, d.offset, d.undo); d.last = p; }
        break;
      case 'matte':
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= spacing * 0.6) { matteAt(p, d.how); d.last = p; }
        break;
      case 'layerMask':
        paintLayerMask(d.mask, norm(d.last), norm(p), (brush * 2) / view.scale / pw, d.reveal);
        d.last = p;
        setMaskVersion((x) => x + 1);
        break;
      case 'protect':
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= spacing * 0.6) { protectAt(p, d.add); d.last = p; }
        break;
      case 'liquify':
        if (!liquify || Math.hypot(p.x - d.last.x, p.y - d.last.y) < 1) return;
        liquify.push(d.last.x / pw, d.last.y / ph, (p.x - d.last.x) / pw, (p.y - d.last.y) / ph, brush / view.scale / pw);
        d.last = p;
        setLiqVersion((v) => v + 1);
        break;
      case 'lasso': {
        const last = d.pts[d.pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) * view.scale >= 3) {
          d.pts.push(p);
          setSelection([...d.pts]);
        }
        break;
      }
      case 'patch':
        setPatchOffset({ x: p.x - d.start.x, y: p.y - d.start.y });
        break;
      case 'crop':
        setCropRect(dragCrop(d.handle, d.rect0, p.x - d.start.x, p.y - d.start.y, aspect === 0 ? 0 : aspectValue(aspect), pw, ph));
        break;
      case 'paint': {
        const last = d.pts[d.pts.length - 1];
        const n = norm(p);
        if (Math.hypot((n.x - last.x) * pw, (n.y - last.y) * ph) * view.scale < 2) return;
        d.pts.push(n);
        // New array identity so the redraw picks up the longer stroke.
        setLayers((ls) => ls.map((l) => (l.id === d.layerId && l.type === 'paint'
          ? { ...l, strokes: [...l.strokes.slice(0, -1), { ...l.strokes[l.strokes.length - 1], pts: [...d.pts] }] } : l)));
        break;
      }
      case 'layer':
        editLayer(d.layerId, { x: d.x0 + (p.x - d.start.x) / pw, y: d.y0 + (p.y - d.start.y) / ph } as Partial<Layer>);
        break;
      case 'pan':
        setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if ((d.mode === 'heal' || d.mode === 'clone') && d.undo.length) pushHistory({ kind: 'pixels', undo: d.undo });
    if (d.mode === 'clone') setCloneOffset(d.offset); // aligned: next stroke keeps the same source offset
    if (d.mode === 'liquify') pushHistory({ kind: 'liquify', prev: d.prev });
    if (d.mode === 'matte') pushHistory({ kind: 'matte', undo: d.undo });
    if (d.mode === 'protect') pushHistory({ kind: 'protect', prev: d.prev });
    if (d.mode === 'lasso' && d.pts.length < 3) setSelection(null);
    if (d.mode === 'patch') {
      if (patchOffset && Math.hypot(patchOffset.x, patchOffset.y) > 2) applyPatch(patchOffset);
      setPatchOffset(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!doc) return;
    const { x: mx, y: my } = local(e.clientX, e.clientY);
    setView((v) => {
      const scale = Math.min(16, Math.max(0.05, v.scale * Math.exp(-e.deltaY * 0.0015)));
      return { scale, x: mx - ((mx - v.x) * scale) / v.scale, y: my - ((my - v.y) * scale) / v.scale };
    });
  };

  const zoom100 = () => {
    const st = stageRef.current;
    if (!doc || !st) return;
    const r = st.getBoundingClientRect();
    const width = side ? r.width / 2 : r.width, height = r.height;
    const scale = k / (window.devicePixelRatio || 1);
    setView({ scale, x: width / 2 - (doc.preview.width * scale) / 2, y: height / 2 - (doc.preview.height * scale) / 2 });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (files.length) openFiles(files);
  };

  // ---- render helpers ----
  const pts = (poly: Pt[], off: Pt = { x: 0, y: 0 }) =>
    poly.map((p) => { const s = toScreen({ x: p.x + off.x, y: p.y + off.y }); return `${s.x},${s.y}`; }).join(' ');
  const cursorImage = cursor && { x: (cursor.x - view.x) / view.scale, y: (cursor.y - view.y) / view.scale };
  const cloneMarker = tool === 'clone'
    ? cloneOffset && cursorImage ? toScreen({ x: cursorImage.x + cloneOffset.x, y: cursorImage.y + cloneOffset.y }) : cloneSrc && toScreen(cloneSrc)
    : null;
  const cropScreen = cropRect && { ...toScreen(cropRect), w: cropRect.w * view.scale, h: cropRect.h * view.scale };
  const selBounds = doc && selLayer && layerBounds(selLayer, doc.preview.width, doc.preview.height);
  const cw = doc ? doc.preview.width * view.scale : 0, ch = doc ? doc.preview.height * view.scale : 0;
  // While straightening, preview the rotation zoomed in just enough to hide the empty corners.
  const tilt = tool === 'crop' && straighten && doc
    ? ` translate(${cw / 2}px, ${ch / 2}px) rotate(${straighten}deg) scale(${1 / straightenScale(doc.preview.width, doc.preview.height, straighten)}) translate(${-cw / 2}px, ${-ch / 2}px)`
    : '';
  const canvasStyle = { width: cw, height: ch, transform: `translate(${view.x}px, ${view.y}px)${tilt}` };

  const sliderProps = {
    settings, doc,
    onStart: () => pushHistory({ kind: 'settings', prev: settings }),
    onChange: (key: string, v: number | string) => setSettings((s) => ({ ...s, [key]: v })),
  };

  const q = search.trim().toLowerCase();
  const panelSections = (group: PanelGroup) => SECTIONS.filter((s) => s.group === group);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Simmer <span>Photo Studio</span></div>
        <button className="primary" onClick={() => fileRef.current?.click()}>Open photos</button>
        {canUseFolders() && <button onClick={openFolder} title="Open every photo in a folder; edits save into its “simmer” subfolder">Open folder</button>}
        <button onClick={runBatch} title="Apply the current edits to every photo in a folder">Batch…</button>
        <div className="sep" />
        <button disabled={!history.length} onClick={undo} title="Ctrl+Z">↶ Undo</button>
        <button disabled={!doc} onClick={() => commit({ ...DEFAULTS, layerSubject: settings.layerSubject, layerBackground: settings.layerBackground })}>Reset edits</button>
        <div className="sep" />
        <span className="label">Compare</span>
        <button disabled={!doc}
          onPointerDown={() => setShowOriginal(true)} onPointerUp={() => setShowOriginal(false)} onPointerLeave={() => setShowOriginal(false)}
          title="Hold to see the original (or hold \)">Hold</button>
        <button className={compare === 'split' ? 'on' : ''} disabled={!doc} onClick={() => setCompare(compare === 'split' ? 'none' : 'split')}>Split</button>
        <button className={compare === 'side' ? 'on' : ''} disabled={!doc} onClick={() => setCompare(compare === 'side' ? 'none' : 'side')}>Side by side</button>
        <div className="sep" />
        <button disabled={!doc} onClick={() => fit()}>Fit</button>
        <button disabled={!doc} onClick={zoom100}>100%</button>
        <div className="grow" />
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
          <option value="jpeg">JPG</option>
          <option value="png">PNG</option>
        </select>
        <select value={outProfile} onChange={(e) => setOutProfile(e.target.value)} title="Colour profile to convert to (and embed) when saving">
          {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name.replace(' IEC61966-2.1', '')}</option>)}
        </select>
        <button onClick={() => setShowKeys(true)} title="Keyboard shortcuts (?)">⌨</button>
        <button disabled={!doc} onClick={saveFace} title="Store this look with a face thumbnail (Shift+F)">Save face</button>
        {tabs.length > 1 && <button onClick={saveAll}>Save all</button>}
        <button className="primary" disabled={!doc} onClick={exportPhoto} title="Ctrl+S. Saves into a “simmer” folder next to the original">Save</button>
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; if (f.length) openFiles(f); e.target.value = ''; }} />
        <input ref={batchRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => {
          const f = [...(e.target.files ?? [])];
          if (f.length) run('Batch…', async (status) => { const failed = await batchExport(f, settings, format, bgImage, null, status); if (failed.length) setError(`Could not process: ${failed.join(', ')}`); });
          e.target.value = '';
        }} />
        <input ref={bgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) chooseBackground(f); e.target.value = ''; }} />
        <input ref={layerImgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImageLayer(f); e.target.value = ''; }} />
      </header>

      {tabs.length > 0 && (
        <nav className="tabbar">
          {tabs.map((t) => (
            <div key={t.id} className={`tab ${t.id === activeId ? 'on' : ''}`} onClick={() => setActiveId(t.id)} title={t.doc.name}>
              <span>{t.doc.name}</span>
              <button onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} title="Close">×</button>
            </div>
          ))}
          <button className="tab-add" onClick={() => fileRef.current?.click()} title="Open more photos">+</button>
        </nav>
      )}

      <main className="body">
        <aside className="toolstrip">
          {TOOL_GROUPS.map((g) => (
            <div key={g.title} className="tool-group">
              <div className="tool-group-title">{g.title}</div>
              {g.tools.map((t) => (
                <button key={t.id} className={tool === t.id ? 'on' : ''} disabled={!doc && t.id !== 'move'}
                  title={`${t.tip} (${t.key})`} onClick={() => chooseTool(t.id)}>
                  <span className="icon">{t.icon}</span>
                  <span className="tlabel">{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="workspace">
          <div className="options">
            <strong>{ALL_TOOLS.find((t) => t.id === tool)?.label}</strong>
            {brushTool && (
              <label className="inline">Size
                <input type="range" min={2} max={brushTool === 'liquify' ? 300 : 150} value={brush}
                  onChange={(e) => setBrushSizes((b) => ({ ...b, [brushTool]: +e.target.value }))} />
              </label>
            )}
            {tool === 'mask' && (
              <>
                <button className={matteMode === 'refine' ? 'on' : ''} onClick={() => setMatteMode('refine')} title="Paint over hair edges to recover strands">✨ Refine edge</button>
                <button className={matteMode === 'add' ? 'on' : ''} onClick={() => setMatteMode('add')}>+ Add</button>
                <button className={matteMode === 'subtract' ? 'on' : ''} onClick={() => setMatteMode('subtract')}>− Subtract</button>
                <label className="inline check"><input type="checkbox" checked={matteSmart} onChange={(e) => setMatteSmart(e.target.checked)} />Smart edges</label>
              </>
            )}
            {tool === 'protect' && (
              <>
                <button className={protectAdd ? 'on' : ''} onClick={() => setProtectAdd(true)}>+ Protect</button>
                <button className={!protectAdd ? 'on' : ''} onClick={() => setProtectAdd(false)}>− Erase</button>
                <button disabled={!doc?.protect} onClick={() => {
                  if (!doc?.protect) return;
                  pushHistory({ kind: 'protect', prev: doc.protect.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, doc.protect.width, doc.protect.height) });
                  doc.protect = undefined;
                  setMaskVersion((v) => v + 1);
                }}>Clear</button>
              </>
            )}
            {(tool === 'brush' || tool === 'eraser') && selLayer?.mask && (
              <label className="inline check"><input type="checkbox" checked={editMask} onChange={(e) => setEditMask(e.target.checked)} />Paint on layer mask</label>
            )}
            {tool === 'brush' && editMask && selLayer?.mask && (
              <>
                <button className={!maskReveal ? 'on' : ''} onClick={() => setMaskReveal(false)}>⬛ Hide</button>
                <button className={maskReveal ? 'on' : ''} onClick={() => setMaskReveal(true)}>⬜ Reveal</button>
              </>
            )}
            {tool === 'brush' && !(editMask && selLayer?.mask) && <label className="inline">Color<input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} /></label>}
            {tool === 'clone' && (
              <label className="inline check"><input type="checkbox" checked={mend} onChange={(e) => setMend(e.target.checked)} />Mend (blend colors)</label>
            )}
            {tool === 'liquify' && <button disabled={!liquify} onClick={() => { pushHistory({ kind: 'liquify', prev: liquify }); setLiquify(null); }}>Reset liquify</button>}
            {(tool === 'lasso' || tool === 'patch') && (
              <>
                <button className="primary" disabled={!selection} onClick={removeSelection}>✨ Remove object</button>
                <button disabled={!selection} onClick={() => setSelection(null)}>Clear selection</button>
              </>
            )}
            {tool === 'crop' && doc && (
              <>
                <select value={String(aspect)} onChange={(e) => {
                  const v = e.target.value;
                  const a = (v === 'original' ? 'original' : Number(v)) as number | 'original';
                  setAspect(a);
                  if (a) setCropRect(fitAspect({ x: 0, y: 0, w: doc.preview.width, h: doc.preview.height }, aspectValue(a)));
                }}>
                  {ASPECTS.map((a) => <option key={a.label} value={String(a.value)}>{a.label}</option>)}
                </select>
                <button onClick={() => transformDoc('Rotating…', (b) => rotateCanvas(b, false))} title="Rotate left">⟲</button>
                <button onClick={() => transformDoc('Rotating…', (b) => rotateCanvas(b, true))} title="Rotate right">⟳</button>
                <button onClick={() => transformDoc('Flipping…', flipCanvas)} title="Flip horizontally">⇋ Flip</button>
                <label className="inline" title="Level a tilted horizon or building (double-click to reset)">Straighten
                  <input type="range" min={-45} max={45} step={0.1} value={straighten}
                    onDoubleClick={() => setStraighten(0)} onChange={(e) => setStraighten(+e.target.value)} />
                  <span className="val">{straighten.toFixed(1)}°</span>
                </label>
                {straighten !== 0 && (
                  <button className="primary" onClick={() => {
                    const deg = straighten;
                    setStraighten(0);
                    transformDoc('Straightening…', (b) => straightenCanvas(b, deg));
                  }}>Apply straighten</button>
                )}
                <button className="primary" onClick={applyCrop}>Apply crop</button>
                <button onClick={() => chooseTool('move')}>Cancel</button>
              </>
            )}
            {HINTS[tool] && <span className="hint">{HINTS[tool]}</span>}
          </div>

          <div
            ref={stageRef}
            className={`stage tool-${tool} ${side ? 'side' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setCursor(null)}
            onWheel={onWheel}
            onContextMenu={(e) => e.preventDefault()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <canvas ref={canvasRef} className="gl" />
            {side && doc && (
              <div className="pane pane-left">
                <canvas ref={origRef} style={canvasStyle} />
                <span className="pane-label">Before</span>
              </div>
            )}
            <div className="pane pane-main">
              <canvas ref={viewRef} style={{ ...canvasStyle, display: doc ? 'block' : 'none' }} />
              {side && doc && <span className="pane-label">After</span>}
              {doc && (selection || selBounds) && (
                <svg className="overlay">
                  {selection && selection.length > 1 && (
                    <>
                      <polygon points={pts(selection)} className="ants-bg" />
                      <polygon points={pts(selection)} className="ants" />
                      {patchOffset && <polygon points={pts(selection, patchOffset)} className="ghost" />}
                    </>
                  )}
                  {selBounds && tool === 'move' && (
                    <rect className="layer-box"
                      x={view.x + selBounds.x * doc.preview.width * view.scale} y={view.y + selBounds.y * doc.preview.height * view.scale}
                      width={selBounds.w * doc.preview.width * view.scale} height={selBounds.h * doc.preview.height * view.scale} />
                  )}
                </svg>
              )}
              {doc && tool === 'crop' && cropScreen && (
                <div className="crop-box" style={{ left: cropScreen.x, top: cropScreen.y, width: cropScreen.w, height: cropScreen.h }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = { mode: 'crop', handle: (e.target as HTMLElement).dataset.h ?? 'move', start: toImage(e.clientX, e.clientY), rect0: cropRect! };
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onDoubleClick={applyCrop}>
                  <div className="thirds" />
                  {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => <div key={h} className={`handle h-${h}`} data-h={h} />)}
                  <span className="crop-size">{Math.round(cropRect!.w * k)} × {Math.round(cropRect!.h * k)}</span>
                </div>
              )}
              {doc && split !== null && (
                <div className="split-handle" style={{ left: view.x + split * doc.preview.width * view.scale }}
                  onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { mode: 'split' }; }}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => (drag.current = null)}>
                  <span>Before | After</span>
                </div>
              )}
              {doc && brushTool && cursor && (
                <div className="brush" style={{ left: cursor.x - brush, top: cursor.y - brush, width: brush * 2, height: brush * 2 }} />
              )}
              {cloneMarker && <div className="clone-src" style={{ left: cloneMarker.x, top: cloneMarker.y }} />}
            </div>
            {!doc && (
              <div className="empty" onClick={() => fileRef.current?.click()}>
                <h1>Drop photos here</h1>
                <p>JPG, PNG, WebP or camera RAW (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2…)</p>
                <p className="muted">Each photo opens in its own tab.{canUseFolders() && ' Use Open folder to save edits into a “simmer” subfolder next to your originals.'}</p>
              </div>
            )}
            {showOriginal && doc && <div className="badge">Before</div>}
            {busy && <div className="busy"><div className="spinner" />{busy}</div>}
            {notice && !busy && <div className="notice">{notice}</div>}
            {error && <div className="error" onClick={() => setError(null)}>{error}</div>}
          </div>
        </section>
        {showKeys && (
          <div className="modal" onClick={() => setShowKeys(false)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <h2>Keyboard shortcuts</h2>
              <dl>{SHORTCUTS.map(([k2, d]) => <div key={k2 + d}><dt><kbd>{k2}</kbd></dt><dd>{d}</dd></div>)}</dl>
              <button onClick={() => setShowKeys(false)}>Close</button>
            </div>
          </div>
        )}

        <aside className="panel">
          <div className="tabs">
            {PANEL_TABS.map((t) => (
              <button key={t.id} className={panelTab === t.id ? 'on' : ''} onClick={() => { setPanelTab(t.id); setSearch(''); }}>{t.label}</button>
            ))}
          </div>
          <div className="search">
            <input type="search" placeholder="🔍 Find a slider… (e.g. teeth, blur)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {look && doc && !inMaskMode && (
            <div className="amount">
              <div className="row">
                <span>✨ <b>{look.name}</b></span>
                <span className="val">{look.amount}%</span>
              </div>
              <input type="range" min={0} max={150} value={look.amount}
                onPointerDown={() => pushHistory({ kind: 'settings', prev: settings })}
                onChange={(e) => setLookAmount(+e.target.value)} />
            </div>
          )}

          <div className="panel-body">
            {inMaskMode ? (
              <div className="select-mask">
                <h3>Select and Mask</h3>
                <button className="primary wide" disabled={!doc} onClick={selectSubject}>✨ Select subject (AI)</button>
                <div className="view-modes">
                  <span>View</span>
                  {MASK_VIEWS.map((v) => (
                    <button key={v.id} className={maskView === v.id ? 'on' : ''} onClick={() => setMaskView(v.id)}>{v.label}</button>
                  ))}
                </div>
                <p className="tip">
                  <b>Refine edge brush</b>: paint along hair and fuzzy edges and it works out which pixels are hair and which are background.
                  <b> Add / Subtract</b> paint the mask directly. Hold Alt to flip. Undo with Ctrl+Z.
                </p>
                {panelSections('mask').map((sec) => <SectionPanel key={sec.id} sec={sec} scope="whole" {...sliderProps} />)}
                <div className="quick">
                  <button disabled={!doc} onClick={() => commit({ ...settings, maskSmooth: 0, maskFeather: 0, maskContrast: 0, edgeShift: 0, decontam: 100 })}>Reset refinements</button>
                  <button className="primary" onClick={() => chooseTool('move')}>OK</button>
                </div>
              </div>
            ) : q ? (
              <SearchResults q={q} {...sliderProps} />
            ) : panelTab === 'quick' ? (
              <>
                <div className="quick magic">
                  <button className="primary" disabled={!doc} onClick={() => applyLook('Magic retouch', MAGIC)}>✨ Magic retouch</button>
                </div>
                <div className="quick">
                  <button disabled={!doc} onClick={() => doc && applyLook('Auto tone', autoSettings(doc.preview, hasFace))}>Auto tone</button>
                  <button disabled={!doc} onClick={() => applyLook('Auto retouch', PRESETS[0].values)}>Auto retouch</button>
                </div>
                <details className="section" open>
                  <summary>Looks</summary>
                  <div className="presets">
                    {PRESETS.map((p) => (
                      <button key={p.name} disabled={!doc} onClick={() => applyLook(p.name, { ...DEFAULTS, ...p.values, layerSubject: settings.layerSubject, layerBackground: settings.layerBackground })}>{p.name}</button>
                    ))}
                  </div>
                </details>
                <details className="section" open>
                  <summary>Background in one click</summary>
                  <BgQuick doc={doc} onPick={applyLook} onImage={() => bgRef.current?.click()} />
                </details>
              </>
            ) : panelTab === 'face' ? (
              <>
              {doc && doc.faces.length > 0 && (
                <div className="faces"><FacePicker faces={faceThumbs} opts={doc.faceOpts} onChange={setFaceOpts} /></div>
              )}
              {panelSections('face').map((sec) => (
                <SectionPanel key={sec.id} sec={sec} scope="whole" {...sliderProps}
                  extra={sec.id === 'features' && (
                    <label className="inline check detect">
                      <input type="checkbox" checked={showFeatures} onChange={(e) => setShowFeatures(e.target.checked)} />
                      Show detected eyes, nose, lips & teeth{doc && ` (${doc.faces.length} face${doc.faces.length === 1 ? '' : 's'})`}
                    </label>
                  )} />
              ))}
              </>
            ) : panelTab === 'adjust' ? (
              <>
                {doc && (
                  <PhotoPanel doc={doc} busy={!!busy}
                    onRaw={(params, opts) => run(opts ? 'Re-decoding RAW…' : 'Developing RAW…', async () => {
                      await redevelopRaw(doc, params, opts);
                      setVersion((v) => v + 1);
                      update((t) => ({ doc: { ...t.doc } }));
                    })}
                    onAssign={(id) => run('Re-reading colours…', async () => {
                      await assignProfile(doc, id);
                      setVersion((v) => v + 1);
                      update((t) => ({ doc: { ...t.doc } }));
                    })} />
                )}
                <div className="scope">
                  <span>Apply to</span>
                  {(['whole', 'subject', 'background'] as const).map((s) => (
                    <button key={s} className={scope === s ? 'on' : ''} disabled={s !== 'whole' && !!doc && !doc.hasSeg} onClick={() => setScope(s)}>
                      {s === 'whole' ? 'Whole photo' : s === 'subject' ? 'Subject' : 'Background'}
                    </button>
                  ))}
                </div>
                {panelSections('adjust').map((sec) => <SectionPanel key={sec.id} sec={sec} scope={scope} {...sliderProps} />)}
              </>
            ) : panelTab === 'background' ? (
              <>
                <details className="section" open>
                  <summary>One click</summary>
                  <BgQuick doc={doc} onPick={applyLook} onImage={() => bgRef.current?.click()} />
                </details>
                <div className="quick">
                  <button disabled={!doc?.hasSeg} onClick={() => chooseTool('mask')}>✂ Refine the cutout (Select and Mask)</button>
                </div>
                {panelSections('background').map((sec) => <SectionPanel key={sec.id} sec={sec} scope="whole" {...sliderProps} />)}
                <p className="tip">Tip: to change only the background's light and color, use Adjust → Background.</p>
              </>
            ) : panelTab === 'faces' ? (
              <div className="faces">
                {doc && doc.faces.length > 0 && (
                  <FacePicker faces={faceThumbs} opts={doc.faceOpts} onChange={setFaceOpts} />
                )}
                <h4>Beauty faces{allMale ? ' (male versions)' : ''}</h4>
                <p className="tip">Ready-made looks from natural to extra glam, shown on your photo. Click one, then use the Amount slider above.</p>
                <div className="face-grid">
                  {BEAUTY_LOOKS.map((f, i) => (
                    <div key={f.name} className="face-card">
                      <button className="thumb" disabled={!doc} title={f.name} onClick={() => applyBeauty(f.name, f.values)}>
                        {lookThumbs[i] ? <img src={lookThumbs[i]} alt={f.name} /> : <span className="ph">{doc ? '…' : '☺'}</span>}
                      </button>
                      <span className="fname">{f.name}</span>
                    </div>
                  ))}
                </div>
                <h4>My saved faces</h4>
                <button className="primary wide" disabled={!doc} onClick={saveFace}>💾 Save face (Shift+F)</button>
                <p className="tip">Stores every edit on this photo with a thumbnail. Click a saved look to apply it to any photo.</p>
                {!savedFaces.length && <p className="tip">No saved looks yet.</p>}
                <div className="face-grid">
                  {savedFaces.map((f) => (
                    <div key={f.id} className="face-card">
                      <button className="thumb" disabled={!doc} onClick={() => applyFace(f)} title="Apply this look">
                        <img src={f.thumb} alt={f.name} />
                      </button>
                      <input value={f.name} onChange={(e) => setSavedFaces((all) => all.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)))} />
                      <button className="del" onClick={() => setSavedFaces((all) => all.filter((x) => x.id !== f.id))} title="Delete">×</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <LayersPanel
                doc={doc} layers={layers} selected={selLayer} settings={settings}
                onSelect={(id) => update(() => ({ selLayer: id }))}
                onAdd={(type) => (type === 'image' ? layerImgRef.current?.click() : addLayer(type))}
                onEdit={(id, patch) => editLayer(id, patch)}
                onEditStart={saveLayersUndo}
                onDelete={(id) => { saveLayersUndo(); setLayers((ls) => ls.filter((l) => l.id !== id), null); }}
                onDuplicate={(l) => { saveLayersUndo(); const c = { ...l, id: newLayer(l.type).id, name: `${l.name} copy` } as Layer; setLayers((ls) => [...ls, c], c.id); }}
                onMove={moveLayer}
                onMask={(id, action) => {
                  const l = layers.find((x) => x.id === id);
                  if (!l || !doc) return;
                  saveLayersUndo();
                  if (action === 'add') { editLayer(id, { mask: newLayerMask(doc.preview.width, doc.preview.height) }); setEditMask(true); setTool('brush'); }
                  else if (action === 'invert' && l.mask) editLayer(id, { mask: invertLayerMask(l.mask) });
                  else if (action === 'delete') editLayer(id, { mask: undefined });
                }}
                onBase={(key, v) => setSettings((s) => ({ ...s, [key]: v }))}
                onBaseStart={() => pushHistory({ kind: 'settings', prev: settings })}
              />
            )}
          </div>

          <footer className="status">
            {doc ? (
              <>
                <div>{doc.name}{tab?.dir && <> · saves to <b>{tab.dir.name}/simmer</b></>}</div>
                <div>{doc.base.width} × {doc.base.height}px · {doc.faces.length} face{doc.faces.length === 1 ? '' : 's'}{doc.hasSeg ? ' · person found' : ''}</div>
              </>
            ) : 'No photo open'}
          </footer>
        </aside>
      </main>
    </div>
  );
}

/** Outlines what the AI detected (eyes, irises, teeth area) so you can check it before whitening. */
function drawFeatures(ctx: CanvasRenderingContext2D, doc: PhotoDoc, w: number, h: number) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, w / 700);
  for (const lm of doc.faces) {
    const P = (i: number) => [lm[i].x * w, lm[i].y * h] as const;
    const outline = (idx: number[], color: string) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      idx.forEach((i, k) => (k ? ctx.lineTo(...P(i)) : ctx.moveTo(...P(i))));
      ctx.closePath();
      ctx.stroke();
    };
    outline(EYE_A, '#3ee8ff');
    outline(EYE_B, '#3ee8ff');
    outline(BROW_A, '#9cff57');
    outline(BROW_B, '#9cff57');
    outline(NOSE_LOWER, '#ff9f43');
    outline(LIPS_OUTER, '#ff5c7a');
    outline(LIPS_INNER, '#ffe14d');
    if (lm.length >= 478) {
      for (const iris of [IRIS_A, IRIS_B]) {
        const [cx, cy] = P(iris[0]);
        const r = iris.slice(1).reduce((s, i) => s + Math.hypot(P(i)[0] - cx, P(i)[1] - cy), 0) / 4;
        ctx.strokeStyle = '#ff5cf0';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Numbers above each face (matching the face picker); skipped faces are dimmed. */
function drawFaceNumbers(ctx: CanvasRenderingContext2D, doc: PhotoDoc, w: number, h: number) {
  const r = Math.max(10, w / 70);
  ctx.save();
  ctx.font = `700 ${r * 1.1}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  doc.faces.forEach((lm, i) => {
    const x = lm[FOREHEAD].x * w, y = lm[FOREHEAD].y * h - r * 1.6;
    const on = doc.faceOpts[i]?.on ?? true;
    ctx.globalAlpha = on ? 1 : 0.5;
    ctx.fillStyle = on ? '#ff7a59' : '#555';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(String(i + 1), x, y + 1);
  });
  ctx.restore();
}

interface SliderProps {
  settings: Settings;
  doc: PhotoDoc | null;
  onStart: () => void;
  onChange: (key: string, value: number | string) => void;
}

function SliderRow({ label, value, min, max, def, disabled, onStart, onChange }: {
  label: string; value: number; min: number; max: number; def: number; disabled: boolean;
  onStart: () => void; onChange: (v: number) => void;
}) {
  return (
    <div className="slider">
      <div className="row">
        <label onDoubleClick={() => { onStart(); onChange(def); }} title="Double-click to reset">{label}</label>
        <span className={value !== def ? 'val changed' : 'val'}>{value > 0 && min < 0 ? `+${value}` : value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} disabled={disabled}
        onPointerDown={onStart} onKeyDown={onStart}
        onDoubleClick={() => { onStart(); onChange(def); }}
        onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function SectionPanel({ sec, scope, settings, doc, onStart, onChange, extra }: SliderProps & { sec: Section; scope: Scope; extra?: ReactNode }) {
  const unavailable = doc && ((sec.needsFace && !doc.faces.length) || (sec.needsSeg && !doc.hasSeg));
  const key = (k: string) => (sec.scoped ? scopedKey(scope, k) : k);
  const sliders = sec.sliders.filter((sl) => scope === 'whole' || !WHOLE_ONLY.has(sl.key));
  return (
    <details className="section" open>
      <summary>{sec.title}{unavailable && <em> · no {sec.needsFace ? 'face' : 'person'} found</em>}</summary>
      {extra}
      {sliders.map((sl) => (
        <SliderRow key={sl.key} label={sl.label} value={Number(settings[key(sl.key)] ?? sl.def ?? 0)} min={sl.min} max={sl.max}
          def={sl.def ?? 0} disabled={!doc} onStart={onStart} onChange={(v) => onChange(key(sl.key), v)} />
      ))}
      {sec.colors && (
        <div className="colors">
          {sec.colors.map((c) => (
            <label key={c.key}>
              <input type="color" value={String(settings[key(c.key)] ?? c.def)} disabled={!doc}
                onFocus={onStart} onChange={(e) => onChange(key(c.key), e.target.value)} />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </details>
  );
}

function SearchResults({ q, settings, doc, onStart, onChange }: SliderProps & { q: string }) {
  const hits = SECTIONS.flatMap((sec) => sec.sliders
    .filter((sl) => sl.label.toLowerCase().includes(q) || sec.title.toLowerCase().includes(q))
    .map((sl) => ({ sec, sl })));
  if (!hits.length) return <p className="tip">No sliders match “{q}”.</p>;
  return (
    <div className="section">
      {hits.map(({ sec, sl }) => (
        <SliderRow key={sl.key} label={`${sl.label} · ${sec.title}`} value={Number(settings[sl.key])} min={sl.min} max={sl.max}
          def={sl.def ?? 0} disabled={!doc} onStart={onStart} onChange={(v) => onChange(sl.key, v)} />
      ))}
    </div>
  );
}

/** RAW development (real camera data) and the photo's colour profile. */
function PhotoPanel({ doc, busy, onRaw, onAssign }: {
  doc: PhotoDoc;
  busy: boolean;
  onRaw: (p: RawParams, opts?: RawDecodeOptions) => void;
  onAssign: (id: string) => void;
}) {
  const raw = doc.raw;
  const [draft, setDraft] = useState<RawParams | null>(raw?.params ?? null);
  useEffect(() => setDraft(raw?.params ?? null), [raw]);
  const commitRaw = () => draft && raw && JSON.stringify(draft) !== JSON.stringify(raw.params) && onRaw(draft);
  const rawSlider = (key: keyof RawParams, label: string, min: number, max: number, step = 1, def = 0) => draft && (
    <div className="slider" key={key}>
      <div className="row">
        <label onDoubleClick={() => onRaw({ ...draft, [key]: def })} title="Double-click to reset">{label}</label>
        <span className="val">{key === 'exposure' ? `${draft[key] > 0 ? '+' : ''}${draft[key].toFixed(2)} EV` : draft[key]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={draft[key]} disabled={busy}
        onChange={(e) => setDraft({ ...draft, [key]: +e.target.value })}
        onPointerUp={commitRaw} onKeyUp={commitRaw} />
    </div>
  );
  return (
    <>
      {raw && draft && (
        <details className="section" open>
          <summary>RAW · camera data</summary>
          <p className="tip raw-info">
            {[raw.data.info.camera, raw.data.info.lens].filter(Boolean).join(' · ')}<br />
            {[raw.data.info.iso && `ISO ${raw.data.info.iso}`, raw.data.info.shutter, raw.data.info.aperture, raw.data.info.focal].filter(Boolean).join(' · ')}
            {' · '}{raw.data.w} × {raw.data.h}, 16-bit
          </p>
          <div className="row2">
            <span className="label">White balance</span>
            {(['shot', 'auto'] as const).map((wb) => (
              <button key={wb} className={raw.opts.wb === wb ? 'on' : ''} disabled={busy}
                onClick={() => onRaw(draft, { ...raw.opts, wb })}>{wb === 'shot' ? 'As shot' : 'Auto'}</button>
            ))}
          </div>
          {rawSlider('exposure', 'Exposure', -3, 3, 0.05, 0)}
          {rawSlider('highlights', 'Highlight recovery', 0, 100, 1, RAW_DEFAULTS.highlights)}
          {rawSlider('shadows', 'Shadow detail', 0, 100, 1, RAW_DEFAULTS.shadows)}
          {rawSlider('temp', 'Temperature', -100, 100)}
          {rawSlider('tint', 'Tint', -100, 100)}
          <div className="row2">
            <span className="label">Noise reduction</span>
            <select value={raw.opts.denoise} disabled={busy} onChange={(e) => onRaw(draft, { ...raw.opts, denoise: +e.target.value as 0 | 1 | 2 })}>
              <option value={0}>Off</option>
              <option value={1}>Light</option>
              <option value={2}>Strong</option>
            </select>
          </div>
          <p className="tip">These work on the full 16-bit sensor data. Tip: set them before retouching (healing/cloning).</p>
        </details>
      )}
      {doc.rawFallback && (
        <p className="tip">This RAW format couldn’t be decoded here, so its built-in full-size JPEG preview is used.</p>
      )}
      <details className="section" open={!raw}>
        <summary>Color profile</summary>
        <p className="tip">Embedded: <b>{doc.color.embedded ?? 'none (treated as sRGB)'}</b>. You edit in sRGB; choose the saved file’s profile next to Save.</p>
        {!raw && doc.file && (
          <div className="row2">
            <span className="label" title="Re-interpret the file's colours as another profile (Assign profile)">Treat colors as</span>
            <select value={doc.color.assigned} disabled={busy} onChange={(e) => onAssign(e.target.value)}>
              <option value="auto">{doc.color.embedded ? 'Embedded profile' : 'sRGB (default)'}</option>
              {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </details>
    </>
  );
}

/** Choose which faces get face edits, and female / male for each. */
function FacePicker({ faces, opts, onChange }: { faces: string[]; opts: FaceOpt[]; onChange: (o: FaceOpt[]) => void }) {
  const set = (i: number, patch: Partial<FaceOpt>) => onChange(opts.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <div className="face-picker">
      <div className="row">
        <h4>Faces in this photo</h4>
        {faces.length > 1 && (
          <span>
            <button onClick={() => onChange(opts.map((o) => ({ ...o, on: true })))}>All</button>
            <button onClick={() => onChange(opts.map((o) => ({ ...o, on: false })))}>None</button>
          </span>
        )}
      </div>
      <div className="picker-grid">
        {faces.map((src, i) => (
          <div key={i} className={`pick ${opts[i]?.on ? 'on' : ''}`}>
            <button className="pthumb" onClick={() => set(i, { on: !opts[i]?.on })} title={opts[i]?.on ? 'Edits apply to this face (click to skip)' : 'Skipped (click to edit this face)'}>
              <img src={src} alt={`Face ${i + 1}`} />
              <span className="num">{i + 1}</span>
              {opts[i]?.on && <span className="tick">✓</span>}
            </button>
            <div className="gender">
              <button className={opts[i]?.gender === 'female' ? 'on' : ''} onClick={() => set(i, { gender: 'female' })} title="Female">♀</button>
              <button className={opts[i]?.gender === 'male' ? 'on' : ''} onClick={() => set(i, { gender: 'male' })} title="Male (no makeup)">♂</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BgQuick({ doc, onPick, onImage }: { doc: PhotoDoc | null; onPick: (name: string, v: Settings) => void; onImage: () => void }) {
  const off = !doc || !doc.hasSeg;
  return (
    <div className="presets">
      {BG_QUICK.map((b) => <button key={b.name} disabled={off} onClick={() => onPick(b.name, b.values)}>{b.name}</button>)}
      <button disabled={off} onClick={onImage}>Your own image…</button>
    </div>
  );
}

const LAYER_ICONS: Record<LayerType, string> = { paint: '🖌', text: 'T', fill: '▦', adjust: '◐', image: '🖼' };

function LayersPanel({ doc, layers, selected, settings, onSelect, onAdd, onEdit, onEditStart, onDelete, onDuplicate, onMove, onMask, onBase, onBaseStart }: {
  onMask: (id: number, action: 'add' | 'invert' | 'delete') => void;
  doc: PhotoDoc | null;
  layers: Layer[];
  selected: Layer | null;
  settings: Settings;
  onSelect: (id: number | null) => void;
  onAdd: (t: LayerType) => void;
  onEdit: (id: number, patch: Partial<Layer>) => void;
  onEditStart: () => void;
  onDelete: (id: number) => void;
  onDuplicate: (l: Layer) => void;
  onMove: (id: number, dir: 1 | -1) => void;
  onBase: (key: string, v: number) => void;
  onBaseStart: () => void;
}) {
  const s = selected;
  const set = (patch: Record<string, unknown>) => s && onEdit(s.id, patch as Partial<Layer>);
  return (
    <>
      <div className="layer-add">
        <span>Add layer</span>
        {(['paint', 'text', 'fill', 'adjust', 'image'] as const).map((t) => (
          <button key={t} disabled={!doc} onClick={() => onAdd(t)} title={`New ${t} layer`}>
            {LAYER_ICONS[t]} {t === 'paint' ? 'Empty' : t === 'fill' ? 'Color' : t === 'adjust' ? 'Adjust' : t === 'image' ? 'Image' : 'Text'}
          </button>
        ))}
      </div>
      <ul className="layer-list">
        {[...layers].reverse().map((l) => (
          <li key={l.id} className={s?.id === l.id ? 'on' : ''} onClick={() => onSelect(l.id)}>
            <button className="eye" onClick={(e) => { e.stopPropagation(); onEditStart(); onEdit(l.id, { visible: !l.visible }); }} title="Show / hide">{l.visible ? '👁' : '–'}</button>
            <span className="licon">{LAYER_ICONS[l.type]}</span>
            <span className="lname">{l.name}</span>
            {l.mask && <span className="mask-chip" title="Has a layer mask">◧</span>}
            <button onClick={(e) => { e.stopPropagation(); onMove(l.id, 1); }} title="Move up">▲</button>
            <button onClick={(e) => { e.stopPropagation(); onMove(l.id, -1); }} title="Move down">▼</button>
          </li>
        ))}
        {(['layerSubject', 'layerBackground'] as const).map((key) => (
          <li key={key} className="base-layer" onClick={() => onSelect(null)}>
            <button className="eye" disabled={!doc?.hasSeg && key === 'layerBackground'}
              onClick={(e) => { e.stopPropagation(); onBaseStart(); onBase(key, num(settings, key) > 0 ? 0 : 100); }}>
              {num(settings, key) > 0 ? '👁' : '–'}
            </button>
            <span className="licon">{key === 'layerSubject' ? '👤' : '🏞'}</span>
            <span className="lname">{key === 'layerSubject' ? 'Subject' : 'Background'} <em>(photo)</em></span>
          </li>
        ))}
      </ul>
      <p className="tip">The photo is split into Subject and Background layers. Hide one to cut it out (saves as a transparent PNG).</p>
      {(['layerSubject', 'layerBackground'] as const).map((key) => (
        <SliderRow key={key} label={`${key === 'layerSubject' ? 'Subject' : 'Background'} opacity`} value={num(settings, key)} min={0} max={100}
          def={100} disabled={!doc || !doc.hasSeg} onStart={onBaseStart} onChange={(v) => onBase(key, v)} />
      ))}

      {s && (
        <div className="section layer-props">
          <div className="row2">
            <input className="lname-input" value={s.name} onFocus={onEditStart} onChange={(e) => set({ name: e.target.value })} />
            <button onClick={() => onDuplicate(s)} title="Duplicate">⧉</button>
            <button onClick={() => onDelete(s.id)} title="Delete">🗑</button>
          </div>
          <div className="row2">
            {!s.mask ? (
              <button onClick={() => onMask(s.id, 'add')} title="Add a layer mask, then paint black to hide parts of this layer">◧ Add layer mask</button>
            ) : (
              <>
                <span className="label">Mask</span>
                <button onClick={() => onMask(s.id, 'invert')}>Invert</button>
                <button onClick={() => onMask(s.id, 'delete')}>Delete mask</button>
              </>
            )}
          </div>
          {s.mask && <p className="tip">Use the Brush (B) with “Paint on layer mask”: black hides, white reveals.</p>}
          <SliderRow label="Opacity" value={Math.round(s.opacity * 100)} min={0} max={100} def={100} disabled={false}
            onStart={onEditStart} onChange={(v) => set({ opacity: v / 100 })} />
          <div className="row2">
            {s.type !== 'adjust' && (
              <select value={s.blend} onFocus={onEditStart} onChange={(e) => set({ blend: e.target.value })}>
                {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            )}
            <select value={s.clip} onFocus={onEditStart} onChange={(e) => set({ clip: e.target.value as Clip })} disabled={!doc?.hasSeg}>
              <option value="all">Whole photo</option>
              <option value="subject">Only subject</option>
              <option value="background">Only background</option>
            </select>
          </div>

          {s.type === 'text' && (
            <>
              <textarea value={s.text} rows={2} onFocus={onEditStart} onChange={(e) => set({ text: e.target.value })} />
              <div className="row2">
                <select value={s.font} onFocus={onEditStart} onChange={(e) => set({ font: e.target.value })}>
                  {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <input type="color" value={s.color} onFocus={onEditStart} onChange={(e) => set({ color: e.target.value })} />
              </div>
              <SliderRow label="Size" value={Math.round(s.size * 500)} min={5} max={150} def={40} disabled={false}
                onStart={onEditStart} onChange={(v) => set({ size: v / 500 })} />
              <div className="row2 checks">
                <label><input type="checkbox" checked={s.bold} onChange={(e) => { onEditStart(); set({ bold: e.target.checked }); }} />Bold</label>
                <label><input type="checkbox" checked={s.italic} onChange={(e) => { onEditStart(); set({ italic: e.target.checked }); }} />Italic</label>
                <label><input type="checkbox" checked={s.shadow} onChange={(e) => { onEditStart(); set({ shadow: e.target.checked }); }} />Shadow</label>
              </div>
              <p className="tip">Drag the text on the photo with the Move tool.</p>
            </>
          )}
          {s.type === 'fill' && (
            <>
              <div className="row2">
                <select value={s.mode} onFocus={onEditStart} onChange={(e) => set({ mode: e.target.value })}>
                  <option value="solid">Solid color</option>
                  <option value="gradient">Gradient</option>
                </select>
                <input type="color" value={s.color} onFocus={onEditStart} onChange={(e) => set({ color: e.target.value })} />
                {s.mode === 'gradient' && <input type="color" value={s.color2} onFocus={onEditStart} onChange={(e) => set({ color2: e.target.value })} />}
              </div>
              {s.mode === 'gradient' && (
                <SliderRow label="Angle" value={s.angle} min={0} max={360} def={45} disabled={false} onStart={onEditStart} onChange={(v) => set({ angle: v })} />
              )}
            </>
          )}
          {s.type === 'adjust' && (
            <>
              {(['brightness', 'contrast', 'saturation'] as const).map((key) => (
                <SliderRow key={key} label={key[0].toUpperCase() + key.slice(1)} value={s[key]} min={-100} max={100} def={0} disabled={false}
                  onStart={onEditStart} onChange={(v) => set({ [key]: v })} />
              ))}
              <SliderRow label="Hue shift" value={s.hue} min={-180} max={180} def={0} disabled={false} onStart={onEditStart} onChange={(v) => set({ hue: v })} />
              <SliderRow label="Blur" value={s.blur} min={0} max={100} def={0} disabled={false} onStart={onEditStart} onChange={(v) => set({ blur: v })} />
            </>
          )}
          {s.type === 'image' && (
            <>
              <SliderRow label="Size" value={Math.round(s.w * 100)} min={2} max={200} def={40} disabled={false} onStart={onEditStart} onChange={(v) => set({ w: v / 100 })} />
              <SliderRow label="Rotation" value={s.rotation} min={-180} max={180} def={0} disabled={false} onStart={onEditStart} onChange={(v) => set({ rotation: v })} />
              <p className="tip">Drag the image on the photo with the Move tool.</p>
            </>
          )}
          {s.type === 'paint' && <p className="tip">Use the Brush (B) and Eraser (E) tools to paint on this layer.</p>}
        </div>
      )}
    </>
  );
}
