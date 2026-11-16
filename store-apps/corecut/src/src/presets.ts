import { useSyncExternalStore } from 'react';
import { nanoid } from 'nanoid';
import type { ColorGrade } from './types';
import { neutralGrade } from './types';

export interface ColorPreset {
  id: string;
  name: string;
  grade: ColorGrade;
  builtIn?: boolean;
}

const g = (p: Partial<ColorGrade>): ColorGrade => ({ ...neutralGrade(), ...p });

export const BUILT_IN_PRESETS: ColorPreset[] = [
  { id: 'b-warm', name: 'Warm sunset', builtIn: true, grade: g({ temperature: 0.45, saturation: 1.15, gain: [0.05, 0.02, -0.04] }) },
  { id: 'b-cool', name: 'Cool blue', builtIn: true, grade: g({ temperature: -0.45, contrast: 1.05, lift: [-0.02, 0, 0.04] }) },
  { id: 'b-teal', name: 'Teal & orange', builtIn: true, grade: g({ contrast: 1.15, saturation: 1.2, lift: [-0.04, 0.02, 0.06], gain: [0.08, 0.02, -0.06] }) },
  { id: 'b-bw', name: 'Black & white', builtIn: true, grade: g({ saturation: 0, contrast: 1.2 }) },
  { id: 'b-vintage', name: 'Vintage film', builtIn: true, grade: g({ contrast: 0.85, saturation: 0.75, temperature: 0.2, lift: [0.06, 0.04, 0.02] }) },
  { id: 'b-punchy', name: 'Punchy', builtIn: true, grade: g({ contrast: 1.3, saturation: 1.35, exposure: 0.1 }) },
  { id: 'b-moody', name: 'Moody', builtIn: true, grade: g({ exposure: -0.3, contrast: 1.2, saturation: 0.8, temperature: -0.15, gamma: [-0.05, -0.05, -0.02] }) },
];

// Saved presets live in this browser's storage, so they are available in every project.
const KEY = 'cutline.colorPresets';
let cache: ColorPreset[] | null = null;
const listeners = new Set<() => void>();

const load = (): ColorPreset[] => {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    cache = [];
  }
  return cache!;
};

const save = (list: ColorPreset[]) => {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage blocked: presets still work for this session
  }
  listeners.forEach((l) => l());
};

export const useUserPresets = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
  );

export const addPreset = (name: string, grade: ColorGrade) =>
  save([...load(), { id: nanoid(8), name: name.trim() || 'My preset', grade: structuredClone(grade) }]);
export const renamePreset = (id: string, name: string) =>
  save(load().map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
export const updatePreset = (id: string, grade: ColorGrade) =>
  save(load().map((p) => (p.id === id ? { ...p, grade: structuredClone(grade) } : p)));
export const deletePreset = (id: string) => save(load().filter((p) => p.id !== id));
