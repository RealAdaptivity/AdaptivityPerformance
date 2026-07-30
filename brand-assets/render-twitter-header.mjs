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

// X / Twitter header: 1500 × 500
const W = 1500;
const H = 500;
const logoSize = 220;

const logo = await sharp('logo-mark-on-transparent.png')
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Keep bottom-left clear for profile avatar overlay on X
const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0c10"/>
      <stop offset="55%" stop-color="#12141a"/>
      <stop offset="100%" stop-color="#1a120c"/>
    </linearGradient>
    <linearGradient id="glow" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#f97316" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="10" height="${H}" fill="#f97316"/>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#f97316"/>

  <text x="310" y="175" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="52" font-weight="900"
    letter-spacing="2">ADAPTIVITY PERFORMANCE</text>

  <text x="310" y="230" fill="#f97316"
    font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700"
    letter-spacing="1.5">FULL-SERVICE MOBILE AUTO · JUSTIN HUB &amp; DFW</text>

  <text x="310" y="290" fill="#e2e8f0"
    font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">
    Driveway or shop · On-site pricing · Multi-trade certified techs · Open 24/7
  </text>

  <rect x="310" y="330" width="520" height="58" rx="10" fill="#f97316"/>
  <text x="570" y="368" text-anchor="middle" fill="#0b0c10"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="22" font-weight="900">
    BOOK A $100 DIAGNOSTIC HOLD
  </text>

  <text x="1450" y="460" text-anchor="end" fill="#94a3b8"
    font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600">
    AdaptivityPerformance.com
  </text>
</svg>`);

const base = await sharp(svg)
  .png()
  .toBuffer();

await sharp(base)
  .composite([{ input: logo, top: 130, left: 48 }])
  .png()
  .toFile('twitter-header.png');

await sharp('twitter-header.png').jpeg({ quality: 92 }).toFile('twitter-header.jpg');

console.log('Wrote twitter-header.png and twitter-header.jpg');
