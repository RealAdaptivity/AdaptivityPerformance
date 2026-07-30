import fs from 'fs';
import sharp from 'sharp';

/** Knock out near-black pixels so only the orange mark remains. */
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

const pad = Math.round(2550 * 0.055);
const w = 2550;
const h = 3300;
const s = 1;
const logoSize = Math.round(w * 0.14);
const logo = await sharp('brand-assets/logo-mark-on-transparent.png')
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#0b0c10"/>
  <rect x="0" y="0" width="24" height="${h}" fill="#f97316"/>
  <rect x="${w - 24}" y="0" width="24" height="${h}" fill="#f97316"/>

  <text x="${w / 2}" y="520" text-anchor="middle" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900"
    letter-spacing="3">ADAPTIVITY PERFORMANCE</text>
  <text x="${w / 2}" y="575" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700">Michael Smith · Owner / Operator</text>
  <text x="${w / 2}" y="620" text-anchor="middle" fill="#f97316"
    font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700"
    letter-spacing="1.5">FULL-SERVICE MOBILE AUTO · JUSTIN HUB &amp; DFW</text>
  <text x="${w / 2}" y="665" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">
    Driveway + shop · On-site pricing · Multi-trade certified techs · Open 24/7
  </text>

  <rect x="${pad}" y="700" width="${w - pad * 2}" height="175" rx="22" fill="#f97316"/>
  <text x="${w / 2}" y="775" text-anchor="middle" fill="#0b0c10"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="38" font-weight="900">
    BOOK A $100 DIAGNOSTIC HOLD
  </text>
  <text x="${w / 2}" y="830" text-anchor="middle" fill="#1c1917"
    font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">
    Labor + parts priced on site after inspection - you approve before we charge
  </text>

  <!-- SERVICES -->
  <text x="${w / 2}" y="960" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="3">ALL SERVICES</text>

  <text x="${pad + 20}" y="1030" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">MECHANICAL</text>
  <text x="${pad + 20}" y="1070" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Diagnostics · Oil · Brakes · Battery / charging · A/C · Suspension · Exhaust
  </text>
  <text x="${pad + 20}" y="1105" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Cooling · Belts &amp; hoses · Ignition · Fuel system · Transmission &amp; differential fluids
  </text>

  <text x="${pad + 20}" y="1165" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">TIRES · WHEELS · GLASS</text>
  <text x="${pad + 20}" y="1205" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Mount / balance / flats · TPMS · Wheel &amp; alignment concerns · Windshield / auto glass
  </text>

  <text x="${pad + 20}" y="1265" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">APPEARANCE · BODY · DETAIL</text>
  <text x="${pad + 20}" y="1305" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Window tint · Vinyl wrap · PPF · Body / dent repair · Mobile detailing
  </text>
  <text x="${pad + 20}" y="1340" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Ceramic coating · Paint correction · Headlight restoration
  </text>

  <text x="${pad + 20}" y="1400" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">AUDIO · INTERIOR · PERFORMANCE</text>
  <text x="${pad + 20}" y="1440" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Car audio · Interior lighting · Interior color · Accessories &amp; custom installs
  </text>
  <text x="${pad + 20}" y="1475" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="20">
    Performance tune / calibration · Intake &amp; exhaust upgrades
  </text>

  <!-- PARTNER PROGRAMS -->
  <text x="${w / 2}" y="1570" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="3">PARTNER PROGRAMS</text>

  <rect x="${pad}" y="1610" width="${(w - pad * 2 - 30) / 2}" height="320" rx="18" fill="#12141c" stroke="#f97316" stroke-width="2"/>
  <rect x="${pad + (w - pad * 2 - 30) / 2 + 30}" y="1610" width="${(w - pad * 2 - 30) / 2}" height="320" rx="18" fill="#12141c" stroke="#38bdf8" stroke-width="2"/>

  <text x="${pad + 40}" y="1675" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">INDEPENDENT TECHS</text>
  <text x="${pad + 40}" y="1725" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="19">
    Join our multi-trade network
  </text>
  <text x="${pad + 40}" y="1765" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · 70% tech / 30% platform split
  </text>
  <text x="${pad + 40}" y="1805" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · Mobile, Justin hub, or partner shops
  </text>
  <text x="${pad + 40}" y="1845" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · Mechanical, tint, wrap, audio, detail &amp; more
  </text>
  <text x="${pad + 40}" y="1885" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="17">
    Apply: AdaptivityPerformance.com/join
  </text>

  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1675" fill="#38bdf8" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">SHOP &amp; GARAGE HOSTS</text>
  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1725" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="19">
    Partner your bay, lift, or garage
  </text>
  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1765" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · We book customers to your location
  </text>
  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1805" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · Holds, tracking &amp; payouts on our platform
  </text>
  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1845" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="18">
    · Keep your brand · Grow volume
  </text>
  <text x="${pad + (w - pad * 2 - 30) / 2 + 70}" y="1885" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="17">
    Apply: AdaptivityPerformance.com/partners
  </text>

  <text x="${w / 2}" y="2000" text-anchor="middle" fill="#f97316"
    font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">
    REFERRALS · $25 / $25 credit when a friend completes their first job
  </text>
  <text x="${w / 2}" y="2045" text-anchor="middle" fill="#94a3b8"
    font-family="Arial, Helvetica, sans-serif" font-size="18">
    Techs can grow into partner status · Solo operators welcome
  </text>

  <!-- COVERAGE -->
  <text x="${w / 2}" y="2135" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="3">WE COME TO YOU</text>
  <text x="${w / 2}" y="2185" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="20">
    Justin · Northlake · Keller · Flower Mound · Southlake · Fort Worth
  </text>
  <text x="${w / 2}" y="2225" text-anchor="middle" fill="#cbd5e1"
    font-family="Arial, Helvetica, sans-serif" font-size="20">
    Arlington · Frisco · Denton · Roanoke · Argyle · Haslet · &amp; more DFW
  </text>

  <!-- CONTACT -->
  <rect x="${pad}" y="2290" width="${w - pad * 2}" height="380" rx="20" fill="#12141c" stroke="#f97316" stroke-width="3"/>
  <text x="${w / 2}" y="2400" text-anchor="middle" fill="#f97316"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="52" font-weight="900">
    (214) 620-3244
  </text>
  <text x="${w / 2}" y="2475" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">
    Owner@adaptivityperformance.com
  </text>
  <text x="${w / 2}" y="2530" text-anchor="middle" fill="#f97316"
    font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">
    AdaptivityPerformance.com
  </text>
  <text x="${w / 2}" y="2595" text-anchor="middle" fill="#94a3b8"
    font-family="Arial, Helvetica, sans-serif" font-size="20">
    410 FM 156, Justin TX 76247 · Open 24/7
  </text>

  <text x="${w / 2}" y="2780" text-anchor="middle" fill="#64748b"
    font-family="Arial, Helvetica, sans-serif" font-size="18">
    12-month nationwide warranty on qualifying work · Transparent on-site pricing
  </text>
  <text x="${w / 2}" y="2830" text-anchor="middle" fill="#475569"
    font-family="Arial, Helvetica, sans-serif" font-size="16">
    Book online · Track your tech · Tip &amp; review after the job
  </text>
</svg>`);

await sharp(svg)
  .composite([{ input: logo, left: Math.round((w - logoSize) / 2), top: 90 }])
  .png()
  .toFile('brand-assets/flyer-letter-8.5x11-300dpi.png');

await sharp('brand-assets/flyer-letter-8.5x11-300dpi.png')
  .jpeg({ quality: 95, mozjpeg: true })
  .toFile('brand-assets/flyer-letter-walgreens.jpg');

fs.copyFileSync('brand-assets/logo-mark-on-transparent.png', 'brand-assets/logo-mark-transparent.png');
console.log('letter flyer updated 8.5x11');
