import { nanoid } from 'nanoid';
import { useEditor } from './store';
import { probeFile } from './engine/engine';
import { mediaHandles } from './fs';

type Source = File | FileSystemFileHandle;

/** Import files (or file handles, which also let Save open next to your clips). Returns the new media ids. */
export async function importMedia(items: Source[]): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    try {
      const file = item instanceof File ? item : await item.getFile();
      const info = await probeFile(file);
      const id = nanoid(8);
      if (!(item instanceof File)) mediaHandles.set(id, item);
      useEditor.getState().addMedia({ id, ...info });
      ids.push(id);
    } catch (e) {
      alert((e as Error).message);
    }
  }
  return ids;
}

/** Files dropped from the desktop, as handles when the browser offers them. */
export async function sourcesFromDrop(dt: DataTransfer): Promise<Source[]> {
  const items = Array.from(dt.items).filter((i) => i.kind === 'file');
  if (items.length && items[0].getAsFileSystemHandle) {
    const handles = await Promise.all(items.map((i) => i.getAsFileSystemHandle!()));
    return handles.filter((h): h is FileSystemFileHandle => h?.kind === 'file');
  }
  return Array.from(dt.files);
}

