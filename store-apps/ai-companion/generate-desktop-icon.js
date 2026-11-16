import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(root, '../../assets/icons/ai-companion.svg');
const outputDirectory = path.join(root, 'build-resources');
const output = path.join(outputDirectory, 'ai-companion.png');

if (!fs.existsSync(source)) throw new Error(`Missing AI Companion icon: ${source}`);
fs.mkdirSync(outputDirectory, { recursive: true });
await sharp(source).resize(512, 512).png().toFile(output);
console.log(`Generated desktop app icon: ${output}`);
