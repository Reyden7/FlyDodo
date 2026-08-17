import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const publicRoot = join(root, 'public');
const outputRoot = join(root, 'dist');
const runtimeAssets = new Set();
const assetPattern = /\/assets\/[^\"'`\r\n]+?\.(?:webp|png|mp3|m4a|ttf)/g;

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

function addAsset(path) {
  if (!path.includes('${')) {
    runtimeAssets.add(decodeURIComponent(path).replaceAll('/', sep).slice(1));
  }
}

for (const sourceFile of await walk(sourceRoot)) {
  if (!['.ts', '.tsx', '.css'].includes(extname(sourceFile))) {
    continue;
  }

  const source = await readFile(sourceFile, 'utf8');
  for (const match of source.matchAll(assetPattern)) {
    addAsset(match[0]);
  }
}

// Ces séquences sont construites dynamiquement dans GameplayScene.
for (let index = 1; index <= 25; index += 1) {
  addAsset(`/assets/obstacles/forest/moustik/${String(index).padStart(2, '0')}.webp`);
}
for (let index = 0; index < 16; index += 1) {
  const frame = String(index).padStart(3, '0');
  addAsset(`/assets/obstacles/lowSky/pterodactyl/frame_${frame}.webp`);
  addAsset(`/assets/obstacles/midSky/eclaire/frame_${frame}.webp`);
}
for (let index = 0; index < 9; index += 1) {
  addAsset(`/assets/obstacles/midSky/nuage/frame_${String(index).padStart(3, '0')}.webp`);
}
for (let index = 0; index < 36; index += 1) {
  addAsset(`/assets/obstacles/lave/frame_${String(index).padStart(3, '0')}.webp`);
}
for (let index = 0; index < 20; index += 1) {
  addAsset(`/assets/Decors/bg-segments/bg_${String(index).padStart(2, '0')}.webp`);
}
for (let index = 1; index <= 6; index += 1) {
  addAsset(`/assets/story/intro-panel-${index}.webp`);
}
for (let index = 1; index <= 12; index += 1) {
  addAsset(
    `/assets/julio/explosion/explosion_${String(index).padStart(2, '0')}.webp`,
  );
}
for (const index of [0, 4, 5, 7, 8, 9, 11, 14, 31, 32, 33, 34, 35]) {
  addAsset(
    `/assets/dodo/sprite-max-px-frames-36-rows-6-cols-6-frames/frame_${String(index).padStart(3, '0')}.webp`,
  );
}
for (let index = 1; index <= 14; index += 1) {
  addAsset(`/assets/dodo/runtime/wing_left_${index}.webp`);
  addAsset(`/assets/dodo/runtime/wing_right_${index}.webp`);
}

// Le chemin de repli des cosmétiques est calculé depuis leur catégorie et id.
for (const file of await walk(join(publicRoot, 'assets', 'Accessoires'))) {
  if (extname(file).toLowerCase() === '.webp') {
    runtimeAssets.add(relative(publicRoot, file));
  }
}

let copiedBytes = 0;
for (const asset of [...runtimeAssets].sort()) {
  const source = join(publicRoot, asset);
  const destination = join(outputRoot, asset);

  try {
    const info = await stat(source);
    if (!info.isFile()) {
      continue;
    }
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
    copiedBytes += info.size;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

console.log(
  `Runtime assets: ${runtimeAssets.size} files, ${(copiedBytes / 1024 / 1024).toFixed(1)} MiB`,
);
