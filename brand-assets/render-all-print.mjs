import fs from 'fs';
import sharp from 'sharp';

/** Knock out near-black pixels so only the orange mark remains. */
async function makeLogoTransparent(src, dest) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 45 && g < 45 && b < 45) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(dest);
  console.log('transparent logo', dest);
}

await makeLogoTransparent('public/logo-512.png', 'brand-assets/logo-mark-on-transparent.png');

// --- Business card 3.5x2 @ 300dpi ---
const CW = 1050;
const CH = 600;
const cardBg = await sharp({
  create: {
    width: CW,
    height: CH,
    channels: 3,
    background: { r: 11, g: 12, b: 16 },
  },
})
  .png()
  .toBuffer();

const accent = await sharp({
  create: {
    width: 14,
    height: CH,
    channels: 3,
    background: { r: 249, g: 115, b: 22 },
  },
})
  .png()
  .toBuffer();

const logoCard = await sharp('brand-assets/logo-mark-on-transparent.png')
  .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const textSvg = Buffer.from(`<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg">
  <text x="400" y="185" fill="#ffffff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="2.2">ADAPTIVITY PERFORMANCE</text>
  <text x="400" y="235" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Michael Smith</text>
  <text x="400" y="280" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Owner / Operator</text>
  <text x="400" y="350" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600">940-304-0620</text>
  <text x="400" y="400" fill="#d1d5db" font-family="Arial, Helvetica, sans-serif" font-size="22">Owner@adaptivityperformance.com</text>
  <text x="400" y="450" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">AdaptivityPerformance.com</text>
</svg>`);

await sharp(cardBg)
  .composite([
    { input: accent, left: 0, top: 0 },
    { input: logoCard, left: 55, top: 160 },
    { input: await sharp(textSvg).png().toBuffer(), left: 0, top: 0 },
  ])
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

console.log('card ok');

// --- Flyer helper ---
async function renderFlyer({ w, h, outPng, outJpg, label }) {
  const pad = Math.round(w * 0.07);
  const s = w / 2550;
  const logoSize = Math.round(w * 0.2);
  const logo = await sharp('brand-assets/logo-mark-on-transparent.png')
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#0b0c10"/>
  <rect x="0" y="0" width="${Math.round(28 * s)}" height="${h}" fill="#f97316"/>
  <rect x="${w - Math.round(28 * s)}" y="0" width="${Math.round(28 * s)}" height="${h}" fill="#f97316"/>

  <text x="${w / 2}" y="${Math.round(h * 0.265)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${Math.round(72 * s)}" font-weight="900"
    letter-spacing="${4 * s}">ADAPTIVITY PERFORMANCE</text>
  <text x="${w / 2}" y="${Math.round(h * 0.305)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(40 * s)}" font-weight="700">Michael Smith</text>
  <text x="${w / 2}" y="${Math.round(h * 0.34)}" text-anchor="middle" fill="#f97316"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(30 * s)}" font-weight="700"
    letter-spacing="${2 * s}">Owner / Operator · Mobile Mechanic · Justin &amp; DFW</text>
  <text x="${w / 2}" y="${Math.round(h * 0.39)}" text-anchor="middle" fill="#e2e8f0"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(34 * s)}" font-weight="600">
    Driveway service · On-site pricing · ASE-level techs
  </text>

  <rect x="${pad}" y="${Math.round(h * 0.42)}" width="${w - pad * 2}" height="${Math.round(h * 0.11)}" rx="${Math.round(24 * s)}" fill="#f97316"/>
  <text x="${w / 2}" y="${Math.round(h * 0.47)}" text-anchor="middle" fill="#0b0c10"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${Math.round(44 * s)}" font-weight="900">
    BOOK A $100 DIAGNOSTIC HOLD
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.505)}" text-anchor="middle" fill="#1c1917"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(28 * s)}" font-weight="700">
    Labor + parts priced on site after inspection - you approve before we charge
  </text>

  <text x="${w / 2}" y="${Math.round(h * 0.58)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(30 * s)}" font-weight="800"
    letter-spacing="${2 * s}">SERVICES</text>
  <text x="${w / 2}" y="${Math.round(h * 0.62)}" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(28 * s)}">
    Brakes · Oil · Batteries · Diagnostics · Electrical · Suspension
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.65)}" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(28 * s)}">
    A/C · Transmission service · Mobile &amp; Justin shop hub
  </text>

  <text x="${w / 2}" y="${Math.round(h * 0.71)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(30 * s)}" font-weight="800"
    letter-spacing="${2 * s}">WE COME TO YOU</text>
  <text x="${w / 2}" y="${Math.round(h * 0.75)}" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(24 * s)}">
    Justin · Northlake · Keller · Flower Mound · Southlake · Fort Worth
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.78)}" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(24 * s)}">
    Arlington · Frisco · Denton · Roanoke · Argyle · Haslet · &amp; more DFW
  </text>

  <rect x="${pad}" y="${Math.round(h * 0.815)}" width="${w - pad * 2}" height="${Math.round(h * 0.14)}" rx="${Math.round(20 * s)}"
    fill="#12141c" stroke="#f97316" stroke-width="${Math.round(3 * s)}"/>
  <text x="${w / 2}" y="${Math.round(h * 0.855)}" text-anchor="middle" fill="#f97316"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${Math.round(48 * s)}" font-weight="900">
    (940) 304-0620
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.89)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(26 * s)}" font-weight="700">
    Owner@adaptivityperformance.com · AdaptivityPerformance.com
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.925)}" text-anchor="middle" fill="#94a3b8"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(22 * s)}">
    410 FM 156, Justin TX 76247 · Open 24/7 · Michael Smith, Owner / Operator
  </text>
  <text x="${w / 2}" y="${Math.round(h * 0.97)}" text-anchor="middle" fill="#64748b"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(18 * s)}">
    12-month nationwide warranty on qualifying work · Transparent pricing
  </text>
</svg>`);

  await sharp(svg)
    .composite([
      {
        input: logo,
        left: Math.round((w - logoSize) / 2),
        top: Math.round(h * 0.04),
      },
    ])
    .png()
    .toFile(outPng);

  await sharp(outPng).jpeg({ quality: 95, mozjpeg: true }).toFile(outJpg);
  console.log(label, outJpg);
}

await renderFlyer({
  w: 2550,
  h: 3300,
  outPng: 'brand-assets/flyer-letter-8.5x11-300dpi.png',
  outJpg: 'brand-assets/flyer-letter-walgreens.jpg',
  label: 'letter',
});

await renderFlyer({
  w: 2550,
  h: 1650,
  outPng: 'brand-assets/flyer-halfpage-8.5x5.5-300dpi.png',
  outJpg: 'brand-assets/flyer-halfpage-walgreens.jpg',
  label: 'half',
});

// Keep HTML print using transparent PNG
fs.copyFileSync('brand-assets/logo-mark-on-transparent.png', 'brand-assets/logo-mark-transparent.png');
console.log('all print assets regenerated');
