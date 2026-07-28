import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const publicAssetsRoot = join(root, 'public', 'assets');
const builtAssetsRoot = join(root, 'dist', 'assets');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

function maxDimensionFor(assetPath) {
  const normalized = assetPath.replaceAll('\\', '/');

  if (
    normalized.startsWith('competences/') ||
    normalized.startsWith('collectable/') ||
    normalized.startsWith('menu/bt/')
  ) {
    return 768;
  }

  if (
    normalized.startsWith('ui/bt/') ||
    normalized.startsWith('shopPasteque/') ||
    normalized.includes('/degats/')
  ) {
    return 1200;
  }

  // Les décors, les écrans plein format et les frames de jeu gardent leur
  // définition d'origine. WebP apporte déjà l'essentiel du gain.
  return null;
}

let sourceBytes = 0;
let outputBytes = 0;
let converted = 0;

for (const builtFile of await walk(builtAssetsRoot)) {
  const builtExtension = extname(builtFile).toLowerCase();
  if (!['.png', '.webp'].includes(builtExtension)) {
    continue;
  }

  const builtAssetPath = relative(builtAssetsRoot, builtFile);
  const assetPath = builtAssetPath.replace(/\.webp$/i, '.png');
  const source = join(publicAssetsRoot, assetPath);
  const destination = source.replace(/\.png$/i, '.webp');
  const sourceInfo = await stat(source);
  const maxDimension = maxDimensionFor(assetPath);
  let pipeline = sharp(source, { limitInputPixels: false }).rotate();

  if (maxDimension) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  await mkdir(dirname(destination), { recursive: true });
  await pipeline
    .webp({
      quality: 86,
      alphaQuality: 92,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);

  const outputInfo = await stat(destination);
  sourceBytes += sourceInfo.size;
  outputBytes += outputInfo.size;
  converted += 1;
}

const savedBytes = sourceBytes - outputBytes;
console.log(
  [
    `Optimized ${converted} PNG files to WebP.`,
    `PNG sources: ${(sourceBytes / 1024 / 1024).toFixed(1)} MiB.`,
    `WebP output: ${(outputBytes / 1024 / 1024).toFixed(1)} MiB.`,
    `Saved: ${(savedBytes / 1024 / 1024).toFixed(1)} MiB (${(
      (savedBytes / sourceBytes) *
      100
    ).toFixed(1)}%).`,
  ].join(' '),
);
