// File System Access helpers (Chrome / Edge). They let CoreCut save a project in place,
// open the save dialog next to your clips, and write exports straight into a folder you pick.

type PickerType = { description: string; accept: Record<string, string[]> };
type StartIn = FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';

declare global {
  interface Window {
    showOpenFilePicker?: (o?: { multiple?: boolean; types?: PickerType[]; startIn?: StartIn; id?: string; excludeAcceptAllOption?: boolean }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (o?: { suggestedName?: string; types?: PickerType[]; startIn?: StartIn; id?: string }) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite'; startIn?: StartIn; id?: string }) => Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemHandle {
    queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }
  interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
  }
}

export const hasFsAccess = () => typeof window.showSaveFilePicker === 'function';

export const MEDIA_TYPES: PickerType[] = [
  {
    description: 'Video, audio and images',
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
  },
];

export const CORE_TYPES: PickerType[] = [{ description: 'CoreCut project', accept: { 'application/x-cutline-core': ['.core'] } }];

/** File handles of imported media, by media id. Kept out of the project (handles aren't JSON). */
export const mediaHandles = new Map<string, FileSystemFileHandle>();

/** True when the user cancelled a picker. */
export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

export async function ensurePermission(h: FileSystemHandle, mode: 'read' | 'readwrite' = 'readwrite') {
  if (!h.queryPermission) return true;
  if ((await h.queryPermission({ mode })) === 'granted') return true;
  return (await h.requestPermission?.({ mode })) === 'granted';
}

export async function writeFile(h: FileSystemFileHandle, data: Blob | string) {
  const w = await h.createWritable();
  await w.write(data);
  await w.close();
}
