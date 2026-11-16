import { RAW_EXT } from './load';

/**
 * Saving next to the originals uses the browser's File System Access API (Chrome / Edge):
 * the user grants access to the photo's folder once, and edits go into a "simmer" subfolder.
 */
export const canUseFolders = () => typeof window.showDirectoryPicker === 'function';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i;

export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker!({ id: 'simmer-photos', mode: 'readwrite' });
  } catch {
    return null; // cancelled
  }
}

/** All photos directly inside the folder (not the simmer output folder). */
export async function listPhotos(dir: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file' || !(IMAGE_EXT.test(entry.name) || RAW_EXT.test(entry.name))) continue;
    files.push(await (entry as FileSystemFileHandle).getFile());
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/** Writes into <folder>/simmer/<name>, creating the subfolder if needed. */
export async function saveToSimmer(dir: FileSystemDirectoryHandle, name: string, blob: Blob) {
  if ((await dir.queryPermission?.({ mode: 'readwrite' })) !== 'granted') {
    if ((await dir.requestPermission?.({ mode: 'readwrite' })) !== 'granted') throw new Error('No permission to save in that folder');
  }
  const sub = await dir.getDirectoryHandle('simmer', { create: true });
  const fh = await sub.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return `${dir.name}/simmer/${name}`;
}
