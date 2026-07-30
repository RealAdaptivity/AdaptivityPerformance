import sharp from 'sharp';

const W = 2400;
const H = 1400;

const nameSvg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="1200" y="480" text-anchor="middle" fill="#f97316"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="140" font-weight="900" letter-spacing="18">OWNER</text>
  <text x="1200" y="820" text-anchor="middle" fill="#ffffff"
    font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="200" font-weight="900" letter-spacing="6">Michael Smith</text>
</svg>`);

await sharp(nameSvg)
  .resize(W, H, { fit: 'fill', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('Shirt-right.png');

console.log('Wrote Shirt-right.png');
