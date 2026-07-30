import sharp from 'sharp';

const ORANGE = '#f97316';
const BG = '#0b0c10';

async function renderFlyer({ w, h, outPng, outJpg, densityLabel }) {
  const pad = Math.round(w * 0.07);
  const s = w / 2550;

  // Logo mark scaled into the flyer (no rounded box — same black field as the page)
  const logoScale = (w * 0.2) / 128;
  const logoX = w / 2 - 64 * logoScale;
  const logoY = h * 0.04;

  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="apOrange" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="${BG}"/>
  <rect x="0" y="0" width="${Math.round(28 * s)}" height="${h}" fill="${ORANGE}"/>
  <rect x="${w - Math.round(28 * s)}" y="0" width="${Math.round(28 * s)}" height="${h}" fill="${ORANGE}"/>

  <g transform="translate(${logoX}, ${logoY}) scale(${logoScale})">
    <g fill="url(#apOrange)">
      <path d="M34 28c-9-9-23-11-27-4 4 1 7 3 10 6l-4 4c-3 3-5 6-6 10 7-4 18-2 27 7l34 34 11-11-45-46z"/>
      <path d="M52 66 41 77l38 38c3.5 3.5 9 3.5 12.5 0l8-8c3.5-3.5 3.5-9 0-12.5L52 66z"/>
      <path d="M72 30h16L66 74H50L72 30z"/>
      <path d="M90 30h16L84 74H68L90 30z"/>
      <rect x="54" y="58" width="24" height="9" rx="2"/>
    </g>
    <path d="M30 102c22 12 48 12 70-2" fill="none" stroke="#f97316" stroke-width="5.5" stroke-linecap="round"/>
  </g>

  <text x="${w / 2}" y="${Math.round(h * 0.265)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${Math.round(72 * s)}" font-weight="900"
    letter-spacing="${4 * s}">ADAPTIVITY PERFORMANCE</text>

  <text x="${w / 2}" y="${Math.round(h * 0.305)}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(40 * s)}" font-weight="700">Michael Smith</text>

  <text x="${w / 2}" y="${Math.round(h * 0.34)}" text-anchor="middle" fill="${ORANGE}"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(30 * s)}" font-weight="700"
    letter-spacing="${2 * s}">Owner / Operator · Mobile Mechanic · Justin &amp; DFW</text>

  <text x="${w / 2}" y="${Math.round(h * 0.39)}" text-anchor="middle" fill="#e2e8f0"
    font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(34 * s)}" font-weight="600">
    Driveway service · On-site pricing · ASE-level techs
  </text>

  <rect x="${pad}" y="${Math.round(h * 0.42)}" width="${w - pad * 2}" height="${Math.round(h * 0.11)}" rx="${Math.round(24 * s)}" fill="${ORANGE}"/>
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
    fill="#12141c" stroke="${ORANGE}" stroke-width="${Math.round(3 * s)}"/>

  <text x="${w / 2}" y="${Math.round(h * 0.855)}" text-anchor="middle" fill="${ORANGE}"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${Math.round(48 * s)}" font-weight="900">
    (214) 620-3244
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

  await sharp(svg).png().toFile(outPng);
  await sharp(outPng).jpeg({ quality: 95, mozjpeg: true }).toFile(outJpg);
  console.log(densityLabel, outJpg);
}

await renderFlyer({
  w: 2550,
  h: 3300,
  outPng: 'brand-assets/flyer-letter-8.5x11-300dpi.png',
  outJpg: 'brand-assets/flyer-letter-walgreens.jpg',
  densityLabel: 'letter',
});

await renderFlyer({
  w: 2550,
  h: 1650,
  outPng: 'brand-assets/flyer-halfpage-8.5x5.5-300dpi.png',
  outJpg: 'brand-assets/flyer-halfpage-walgreens.jpg',
  densityLabel: 'half',
});

console.log('flyers ready');
