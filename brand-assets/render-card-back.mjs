import fs from 'fs';
import sharp from 'sharp';

const W = 1050;
const H = 600; // 3.5" x 2" @ 300dpi
// Conservative Walgreens safe inset (~0.25" = 75px)
const SAFE = 78;
const STRIPE = 14;
const L = SAFE;
const maxR = W - STRIPE - SAFE;
const contentW = maxR - L;

const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0b0c10"/>
  <rect x="${W - STRIPE}" y="0" width="${STRIPE}" height="${H}" fill="#f97316"/>

  <text x="${L}" y="${SAFE + 28}" fill="#f97316" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="17" font-weight="900" letter-spacing="1.8">WHAT WE OFFER</text>

  <text x="${L}" y="${SAFE + 68}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800">$100 diagnostic hold</text>
  <text x="${L}" y="${SAFE + 92}" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="12.5">On-site labor + parts - you approve before charge</text>

  <text x="${L}" y="${SAFE + 132}" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800">MECHANICAL</text>
  <text x="${L}" y="${SAFE + 154}" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="12">Diagnostics · Oil · Brakes · Battery · A/C · Suspension · Fluids</text>

  <text x="${L}" y="${SAFE + 188}" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800">TIRES · GLASS · BODY</text>
  <text x="${L}" y="${SAFE + 210}" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="12">Mount / flats · Auto glass · Dent / body · Detailing · Ceramic</text>

  <text x="${L}" y="${SAFE + 244}" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800">TINT · WRAP · AUDIO · PERFORMANCE</text>
  <text x="${L}" y="${SAFE + 266}" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="12">Window tint · Vinyl / PPF · Car audio · Tunes · Upgrades</text>

  <text x="${L}" y="${SAFE + 300}" fill="#f97316" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800">PARTNERS</text>
  <text x="${L}" y="${SAFE + 322}" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="12">Techs 70/30 · Shop hosts · Referrals $25/$25</text>

  <text x="${L}" y="${SAFE + 368}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700">AdaptivityPerformance.com</text>
  <text x="${L}" y="${SAFE + 396}" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="12">Mobile + Justin hub · 24/7 · DFW · 12-mo warranty</text>
</svg>`);

// Last text baseline SAFE+396 = 474; safe bottom = 600-78 = 522 → fits with room

await sharp(svg).png().toFile('brand-assets/business-card-back-3.5x2-300dpi.png');
await sharp('brand-assets/business-card-back-3.5x2-300dpi.png')
  .jpeg({ quality: 96, mozjpeg: true })
  .toFile('brand-assets/business-card-back-walgreens.jpg');

await sharp('brand-assets/business-card-back-3.5x2-300dpi.png')
  .extend({
    top: 38,
    bottom: 37,
    left: 38,
    right: 37,
    background: { r: 11, g: 12, b: 16 },
  })
  .resize(1125, 675)
  .jpeg({ quality: 96, mozjpeg: true })
  .toFile('brand-assets/business-card-back-walgreens-bleed.jpg');

console.log('safe fit ok', { L, maxR, contentW, lastY: SAFE + 396, safeBottom: H - SAFE });
