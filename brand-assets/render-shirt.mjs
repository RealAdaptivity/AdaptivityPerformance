import sharp from 'sharp';

async function makeLogoTransparent(src, dest) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 45 && data[i + 1] < 45 && data[i + 2] < 45) data[i + 3] = 0;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(dest);
}

await makeLogoTransparent('../public/logo-512.png', 'logo-mark-on-transparent.png');

const W = 3000;
const H = 3000;
const logoSize = 1200;

const logoPng = await sharp('logo-mark-on-transparent.png')
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const nameSvg = Buffer.from(`<svg width="${W}" height="900" xmlns="http://www.w3.org/2000/svg">
  <text x="1500" y="320" text-anchor="middle" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="220" font-weight="900" letter-spacing="12">ADAPTIVITY</text>
  <text x="1500" y="620" text-anchor="middle" fill="#f97316"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="160" font-weight="900" letter-spacing="28">PERFORMANCE</text>
</svg>`);

const namePng = await sharp(nameSvg)
  .resize(W, 900, { fit: 'fill', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: logoPng, top: 200, left: Math.round((W - logoSize) / 2) },
    { input: namePng, top: 1500, left: 0 },
  ])
  .png()
  .toFile('Shirt.png');

console.log('Wrote Shirt.png');
