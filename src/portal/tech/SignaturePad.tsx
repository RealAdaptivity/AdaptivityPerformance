import React, { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  /** Called with true once something is drawn, false after Clear. */
  onChange: (hasInk: boolean) => void;
  /** Hands the parent a way to read the drawing as a PNG. */
  exportRef: React.MutableRefObject<(() => Promise<Blob | null>) | null>;
  disabled?: boolean;
};

/**
 * A white pad the customer signs with a finger. Drawn at twice the on-screen
 * size so the saved PNG is crisp; touch-action is off so signing does not
 * scroll the page.
 */
export const SignaturePad: React.FC<Props> = ({ onChange, exportRef, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasInk(false);
    onChange(false);
  }, [onChange]);

  useEffect(() => {
    clear();
    exportRef.current = () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve(null);
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
    return () => {
      exportRef.current = null;
    };
    // Both are stable (the parent passes a state setter and a ref), so this
    // runs once. A new onChange on every render would wipe the signature.
  }, [clear, exportRef]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.fill();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) {
      setHasInk(true);
      onChange(true);
    }
  };

  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-600">Customer signature</span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="min-h-[36px] px-2 text-sm font-semibold text-orange-700 disabled:text-zinc-400"
        >
          Clear
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={1000}
          height={360}
          aria-label="Signature pad. The customer signs here with a finger."
          className="block h-[150px] w-full touch-none rounded-xl border-[1.5px] border-dashed border-zinc-400 bg-white"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-x-4 bottom-7 flex items-end gap-1.5 text-zinc-400">
            <span className="font-heading text-lg leading-none">×</span>
            <span className="h-px flex-1 bg-zinc-400" />
          </div>
        )}
        {!hasInk && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[11px] text-zinc-500">
            Sign with your finger
          </p>
        )}
      </div>
    </div>
  );
};
