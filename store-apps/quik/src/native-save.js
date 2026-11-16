import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

if (Capacitor.isNativePlatform()) {
  window.aviocSaveBlob = async (blob, filename) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('Could not prepare the exported clip.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const saved = await Filesystem.writeFile({ path: `QU!K/${filename}`, data: base64, directory: Directory.Documents, recursive: true });
    await Share.share({ title: 'Your QU!K video clip', url: saved.uri, dialogTitle: 'Save or share your clip' });
  };
}
