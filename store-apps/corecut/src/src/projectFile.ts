import { create } from 'zustand';
import { useEditor } from './store';
import type { Project } from './types';
import { CORE_TYPES, ensurePermission, hasFsAccess, isAbort, mediaHandles, writeFile } from './fs';
import { probeFile } from './engine/engine';
import { isAndroidApp, saveAndShareAndroidFile } from './nativeFiles';

/** Where the open project lives on disk, and what was last saved there. */
interface ProjectFileState {
  handle: FileSystemFileHandle | null;
  fileName: string | null;
  saved: Project | null;
  status: string | null;
}

export const useProjectFile = create<ProjectFileState>(() => ({ handle: null, fileName: null, saved: null, status: null }));

export const isDirty = (p: Project, saved: Project | null) => (saved ? p !== saved : p.clips.length > 0 || p.media.length > 0);

const FORMAT = 'cutline-core';

const serialize = (p: Project) =>
  JSON.stringify(
    // object URLs don't survive a reload, so media are stored by file name and relinked on open
    { format: FORMAT, version: 1, savedAt: new Date().toISOString(), project: { ...p, media: p.media.map((m) => ({ ...m, url: '' })) } },
    null,
    2,
  );

const flash = (status: string) => {
  useProjectFile.setState({ status });
  setTimeout(() => useProjectFile.getState().status === status && useProjectFile.setState({ status: null }), 2500);
};

/**
 * Save the project. The first save asks where (starting in the folder of your first clip);
 * after that, Save overwrites the same .core file in place.
 */
export async function saveProject(saveAs = false) {
  const project = useEditor.getState().project;
  const fileState = useProjectFile.getState();
  if (!hasFsAccess()) {
    const contents = new Blob([serialize(project)], { type: 'application/json' });
    if (isAndroidApp()) {
      try {
        await saveAndShareAndroidFile(`${project.name || 'Untitled'}.core`, contents);
        useProjectFile.setState({ saved: project });
        flash('Project saved');
      } catch (e) {
        alert(`Couldn't save: ${(e as Error).message}`);
      }
      return;
    }
    // Fallback for browsers without file system access: download a copy.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(contents);
    a.download = `${project.name}.core`;
    a.click();
    useProjectFile.setState({ saved: project });
    return;
  }
  try {
    let handle = saveAs ? null : fileState.handle;
    if (!handle) {
      const firstClip = project.media.map((m) => mediaHandles.get(m.id)).find(Boolean);
      handle = await window.showSaveFilePicker!({
        suggestedName: `${project.name || 'Untitled'}.core`,
        types: CORE_TYPES,
        id: 'cutline-project',
        ...(firstClip ? { startIn: firstClip } : {}),
      });
    }
    if (!(await ensurePermission(handle))) throw new Error('CoreCut was not allowed to write the project file.');
    await writeFile(handle, serialize(project));
    useProjectFile.setState({ handle, fileName: handle.name, saved: project });
    flash('Saved');
  } catch (e) {
    if (!isAbort(e)) alert(`Couldn't save: ${(e as Error).message}`);
  }
}

export async function openProject(file?: File) {
  try {
    let handle: FileSystemFileHandle | null = null;
    if (!file) {
      if (!hasFsAccess()) {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.core,.json,application/json';
        picker.onchange = () => { if (picker.files?.[0]) void openProject(picker.files[0]); };
        picker.click();
        return;
      }
      [handle] = await window.showOpenFilePicker!({ types: CORE_TYPES, id: 'cutline-project' });
      file = await handle.getFile();
    }
    const data = JSON.parse(await file.text());
    const project: Project = data.format === FORMAT ? data.project : data; // old .json projects open too
    if (!project?.tracks || !project?.clips) throw new Error('not a project');
    useEditor.getState().loadProject(project);
    useProjectFile.setState({ handle, fileName: handle?.name ?? file.name, saved: useEditor.getState().project });
    if (project.media.length && handle) await relinkFromFolder(handle);
  } catch (e) {
    if (!isAbort(e)) alert('That file is not a valid CoreCut project.');
  }
}

/** Ask for the folder holding the clips (opening next to the project file) and relink media by file name. */
export async function relinkFromFolder(startIn?: FileSystemHandle) {
  if (!window.showDirectoryPicker) return false;
  try {
    const dir = await window.showDirectoryPicker({ id: 'cutline-media', mode: 'read', ...(startIn ? { startIn } : {}) });
    const found = new Map<string, FileSystemFileHandle>();
    const walk = async (d: FileSystemDirectoryHandle, depth: number) => {
      for await (const entry of (d as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
        if (entry.kind === 'file' && !found.has(entry.name)) found.set(entry.name, entry as FileSystemFileHandle);
        else if (entry.kind === 'directory' && depth < 2) await walk(entry as FileSystemDirectoryHandle, depth + 1);
      }
    };
    await walk(dir, 0);
    await relinkWith(found);
    return true;
  } catch (e) {
    if (!isAbort(e)) alert(`Couldn't read that folder: ${(e as Error).message}`);
    return false;
  }
}

/** Relink missing media from files picked by hand (fallback). */
export async function relinkFiles(files: FileList) {
  await relinkWith(new Map(Array.from(files).map((f) => [f.name, f])));
}

async function relinkWith(found: Map<string, FileSystemFileHandle | File>) {
  const before = useEditor.getState().project;
  const media = await Promise.all(
    before.media.map(async (m) => {
      const hit = !m.url && found.get(m.name);
      if (!hit) return m;
      const file = hit instanceof File ? hit : await hit.getFile();
      if (!(hit instanceof File)) mediaHandles.set(m.id, hit);
      return { ...m, url: (await probeFile(file)).url };
    }),
  );
  // relinking doesn't change the saved file, so keep the "saved" marker in step
  const wasSaved = useProjectFile.getState().saved === before;
  const project = { ...useEditor.getState().project, media };
  useEditor.setState({ project });
  if (wasSaved) useProjectFile.setState({ saved: project });
  const missing = media.filter((m) => !m.url).length;
  flash(missing ? `${missing} clip(s) still missing` : 'All clips relinked');
}
