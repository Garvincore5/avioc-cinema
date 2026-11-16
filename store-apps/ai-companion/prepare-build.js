import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
for (const directory of ['js', 'css']) {
  const source = path.join(root, directory);
  const destination = path.join(root, 'public', directory);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}
console.log('Copied the AI companion interface scripts and styles into the browser package.');
