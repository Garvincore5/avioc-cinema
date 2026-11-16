import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isAndroidApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

/** Save into CoreCut's Android Documents folder, then open Android's share/save chooser. */
export async function saveAndShareAndroidFile(fileName: string, contents: Blob) {
  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-');
  const buffer = await contents.arrayBuffer();
  const { uri } = await Filesystem.writeFile({
    path: `CoreCut/${safeName}`,
    directory: Directory.Documents,
    recursive: true,
    data: toBase64(buffer),
  });
  await Share.share({
    title: safeName,
    text: 'Created with CoreCut',
    url: uri,
    dialogTitle: 'Save or share your CoreCut file',
  });
}
