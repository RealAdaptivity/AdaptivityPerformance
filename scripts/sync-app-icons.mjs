import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public', 'logo-512.png');
const BG = { r: 9, g: 10, b: 15, alpha: 1 }; // #090a0f

const APP_DIRS = [
  path.resolve(ROOT, '../adaptivity-tech-app/assets'),
  path.resolve(ROOT, '../adaptivity-customer-app/assets'),
];

async function knockOutBlack(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 45 && data[i + 1] < 45 && data[i + 2] < 45) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function compose({ size, logoScale, background }) {
  const logoBuf = await knockOutBlack(SRC);
  const logoSize = Math.round(size * logoScale);
  const logo = await sharp(logoBuf)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const left = Math.round((size - logoSize) / 2);
  const top = Math.round((size - logoSize) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
}

async function makeMonochrome(size) {
  const logoBuf = await knockOutBlack(SRC);
  const { data, info } = await sharp(logoBuf)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 20) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  const mark = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  const logoSize = Math.round(size * 0.55);
  const resized = await sharp(mark).resize(logoSize, logoSize).png().toBuffer();
  const left = Math.round((size - logoSize) / 2);
  const top = Math.round((size - logoSize) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

const icon = await compose({ size: 1024, logoScale: 0.82, background: BG });
const adaptiveFg = await compose({
  size: 1024,
  logoScale: 0.58,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
});
const adaptiveBg = await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: BG },
}).png().toBuffer();
const splash = await compose({
  size: 1024,
  logoScale: 0.72,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
});
const favicon = await compose({ size: 48, logoScale: 0.9, background: BG });
const mono = await makeMonochrome(1024);
const inApp = await compose({
  size: 256,
  logoScale: 0.92,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
});

for (const dir of APP_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
  await Promise.all([
    fs.promises.writeFile(path.join(dir, 'icon.png'), icon),
    fs.promises.writeFile(path.join(dir, 'adaptive-icon.png'), adaptiveFg),
    fs.promises.writeFile(path.join(dir, 'android-icon-foreground.png'), adaptiveFg),
    fs.promises.writeFile(path.join(dir, 'android-icon-background.png'), adaptiveBg),
    fs.promises.writeFile(path.join(dir, 'android-icon-monochrome.png'), mono),
    fs.promises.writeFile(path.join(dir, 'splash-icon.png'), splash),
    fs.promises.writeFile(path.join(dir, 'favicon.png'), favicon),
    fs.promises.writeFile(path.join(dir, 'logo.png'), inApp),
  ]);
  console.log('Updated', dir);
}

console.log('Done — app icons regenerated from public/logo-512.png');
