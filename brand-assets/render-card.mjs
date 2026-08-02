import fs from 'fs';
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

await makeLogoTransparent('public/logo-512.png', 'brand-assets/logo-mark-on-transparent.png');

const W = 1050;
const H = 600;
// Aggressive inset so Walgreens "Safe Area" clears logo + text
const SAFE = 100; // ~0.33"
const STRIPE = 12;
const logoSize = 168;
const logo = await sharp('brand-assets/logo-mark-on-transparent.png')
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const logoLeft = SAFE;
const logoTop = Math.round((H - logoSize) / 2);
const textX = SAFE + logoSize + 32;

const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0b0c10"/>
  <rect x="0" y="0" width="${STRIPE}" height="${H}" fill="#f97316"/>

  <text x="${textX}" y="165" fill="#ffffff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="20" font-weight="900" letter-spacing="1.4">ADAPTIVITY</text>
  <text x="${textX}" y="195" fill="#ffffff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="20" font-weight="900" letter-spacing="1.4">PERFORMANCE</text>

  <text x="${textX}" y="250" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">Michael Smith</text>
  <text x="${textX}" y="282" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700">Owner / Operator</text>

  <text x="${textX}" y="340" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">940-304-0620</text>
  <text x="${textX}" y="378" fill="#d1d5db" font-family="Arial, Helvetica, sans-serif" font-size="14">Owner@adaptivityperformance.com</text>
  <text x="${textX}" y="412" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700">AdaptivityPerformance.com</text>
</svg>`);

await sharp(svg)
  .composite([{ input: logo, left: logoLeft, top: logoTop }])
  .png()
  .toFile('brand-assets/business-card-3.5x2-300dpi.png');

await sharp('brand-assets/business-card-3.5x2-300dpi.png')
  .jpeg({ quality: 96, mozjpeg: true })
  .toFile('brand-assets/business-card-walgreens.jpg');

await sharp('brand-assets/business-card-3.5x2-300dpi.png')
  .extend({
    top: 38,
    bottom: 37,
    left: 38,
    right: 37,
    background: { r: 11, g: 12, b: 16 },
  })
  .resize(1125, 675)
  .jpeg({ quality: 96, mozjpeg: true })
  .toFile('brand-assets/business-card-walgreens-bleed.jpg');

console.log('front refit', {
  logo: [logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize],
  textX,
  lastY: 412,
  safe: [SAFE, SAFE, W - SAFE, H - SAFE],
});
