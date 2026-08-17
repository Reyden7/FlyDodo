import { mkdir, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const sourcePath = join(root, 'public', 'assets', 'Decors', 'bg.png');
const outputDirectory = join(
  root,
  'public',
  'assets',
  'Decors',
  'bg-segments',
);
const segmentCount = 20;
const outputWidth = 390;
const segmentNamePattern = /^bg_\d{2}\.(?:png|webp)$/i;

await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
  if (entry.isFile() && segmentNamePattern.test(entry.name)) {
    await unlink(join(outputDirectory, entry.name));
  }
}

const sourceMetadata = await sharp(sourcePath, {
  limitInputPixels: false,
}).metadata();

if (!sourceMetadata.width || !sourceMetadata.height) {
  throw new Error(`Impossible de lire les dimensions de ${sourcePath}`);
}

const outputHeight = Math.round(
  (sourceMetadata.height * outputWidth) / sourceMetadata.width,
);
const resizedBackground = await sharp(sourcePath, {
  limitInputPixels: false,
})
  .resize({ width: outputWidth })
  .png()
  .toBuffer();

for (let index = 0; index < segmentCount; index += 1) {
  const top = Math.round((index * outputHeight) / segmentCount);
  const bottom = Math.round(((index + 1) * outputHeight) / segmentCount);
  const filename = `bg_${String(index).padStart(2, '0')}.webp`;

  await sharp(resizedBackground)
    .extract({
      left: 0,
      top,
      width: outputWidth,
      height: bottom - top,
    })
    .webp({
      quality: 86,
      alphaQuality: 92,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(join(outputDirectory, filename));

  console.log(`${filename}: ${outputWidth} × ${bottom - top}`);
}

console.log(
  `Fond reconstruit : ${segmentCount} segments WebP, ${outputWidth} × ${outputHeight} au total.`,
);
