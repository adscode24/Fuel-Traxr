// Generate resources/icon.png (1024x1024) from resources/icon.svg using sharp.
// sharp already exists in devDependencies, so this works in GitHub Actions after `npm install`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcSvg = path.join(root, 'resources', 'icon.svg');
const fallbackSvg = path.join(root, 'public', 'icon.svg');
const outPng = path.join(root, 'resources', 'icon.png');

const { default: sharp } = await import('sharp');

const input = fs.existsSync(srcSvg) ? srcSvg : fallbackSvg;
if (!fs.existsSync(input)) {
  throw new Error(`Icon SVG not found: ${input}`);
}

fs.mkdirSync(path.dirname(outPng), { recursive: true });

// density tinggi agar SVG tajam saat di-raster ke 1024px
await sharp(input, { density: 1024 })
  .resize(1024, 1024, { fit: 'contain', background: '#5FB6E9' })
  .png()
  .toFile(outPng);

console.log(`Generated ${outPng} from ${input}`);
