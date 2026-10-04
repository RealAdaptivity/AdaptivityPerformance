import React, { useMemo } from 'react';
import { create } from 'qrcode';

/** A QR code as inline SVG: black modules on a white quiet zone, so a bank
 *  app can scan it straight off the tech's screen. */
export const QrCode: React.FC<{ value: string; size: number; label: string }> = ({ value, size, label }) => {
  const { path, count } = useMemo(() => {
    const qr = create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);
  const quiet = 4;
  const box = count + quiet * 2;
  return (
    <svg width={size} height={size} viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label={label}>
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
};
