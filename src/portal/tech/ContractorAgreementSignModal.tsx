import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONTRACTOR_AGREEMENT_SECTIONS } from '../../content/contractorAgreementText';
import { Check, FileText, Printer, X } from 'lucide-react';
import {
  CONTRACTOR_AGREEMENT_VERSION,
  signContractorAgreement,
} from '../../services/contractorAgreement';
import { openContractorAgreementPrintWindow } from '../../services/contractorAgreementPdf';

type Props = {
  open: boolean;
  onClose: () => void;
  onSigned: (result: { signedAt: string; signerName: string; signaturePath: string }) => void;
};

/**
 * Read, then sign — in that order.
 *
 * The previous version put the summary, the name field and the signature pad
 * above the terms, so a contractor could draw a signature and tick "I have read
 * this agreement" without the agreement ever having been on screen. Here the
 * full text comes first and the signing controls stay disabled until the
 * contractor has scrolled to the end of it.
 */
export const ContractorAgreementSignModal: React.FC<Props> = ({ open, onClose, onSigned }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const termsRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const [signerName, setSignerName] = useState('');
  const [ack, setAck] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f1218';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasStroke(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSignerName('');
    setAck(false);
    setReadToEnd(false);
    setError(null);
    resetCanvas();
    if (termsRef.current) termsRef.current.scrollTop = 0;
  }, [open, resetCanvas]);

  /**
   * On a tall screen the terms may not overflow at all. Treat "nothing to
   * scroll" as read rather than leaving the contractor with a control that
   * never unlocks.
   */
  const checkRead = useCallback(() => {
    const el = termsRef.current;
    if (!el) return;
    const slack = 24; // don't demand a pixel-perfect landing
    if (el.scrollHeight - el.clientHeight <= slack || el.scrollTop + el.clientHeight >= el.scrollHeight - slack) {
      setReadToEnd(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Run after layout so scrollHeight is real.
    const id = window.requestAnimationFrame(checkRead);
    return () => window.cancelAnimationFrame(id);
  }, [open, checkRead]);

  if (!open) return null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!readToEnd) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasStroke(true);
    setError(null);
  };

  const onPointerUp = () => {
    drawing.current = false;
  };

  const jumpToEnd = () => {
    const el = termsRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const submit = async () => {
    setError(null);
    if (!readToEnd) {
      setError('Scroll to the end of the agreement before signing.');
      return;
    }
    if (signerName.trim().length < 2) {
      setError('Enter your full legal name as it appears on your ID.');
      return;
    }
    if (!hasStroke) {
      setError('Draw your signature in the box.');
      return;
    }
    if (!ack) {
      setError('Check the box to confirm you agree to the terms.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const result = await signContractorAgreement({
        signerName,
        signatureDataUrl: canvas.toDataURL('image/png'),
      });
      onSigned({
        signedAt: result.signedAt,
        signerName: signerName.trim(),
        signaturePath: result.signaturePath,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save signature');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#12141c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#12141c] px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-white">Independent Contractor Agreement</h3>
            <p className="text-[10px] text-slate-500">
              Adaptivity Performance LLC · Version {CONTRACTOR_AGREEMENT_VERSION} · E-SIGN Act
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1 — read. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 1 · Read the agreement
              </p>
              <button
                type="button"
                onClick={() =>
                  openContractorAgreementPrintWindow({ agreementVersion: CONTRACTOR_AGREEMENT_VERSION })
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400"
              >
                <Printer className="w-3 h-3" />
                Open printable copy
              </button>
            </div>

            <div
              ref={termsRef}
              onScroll={checkRead}
              className="h-[46vh] min-h-[260px] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0c10] px-4 py-3 space-y-3"
            >
              {CONTRACTOR_AGREEMENT_SECTIONS.map((section) => (
                <section key={section.heading} className="space-y-1.5">
                  <h4 className="text-[12px] font-bold text-white">{section.heading}</h4>
                  {section.blocks.map((block, i) =>
                    block.kind === 'p' ? (
                      <p key={i} className="text-[11px] text-slate-300 leading-relaxed">
                        {block.text}
                      </p>
                    ) : (
                      <ul
                        key={i}
                        className={`text-[11px] text-slate-300 leading-relaxed pl-4 space-y-1 ${
                          block.kind === 'ol' ? 'list-decimal' : 'list-disc'
                        }`}
                      >
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  )}
                </section>
              ))}
              <p className="pt-2 text-[10px] text-slate-500 border-t border-white/10">
                End of agreement · Version {CONTRACTOR_AGREEMENT_VERSION}
              </p>
            </div>

            {readToEnd ? (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                You&apos;ve read to the end. Signing is unlocked below.
              </p>
            ) : (
              <button
                type="button"
                onClick={jumpToEnd}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300"
              >
                <FileText className="w-3.5 h-3.5" />
                Scroll to the end to unlock signing — tap to jump
              </button>
            )}
          </div>

          {/* Step 2 — sign. Locked until the terms have actually been read. */}
          <div
            aria-disabled={!readToEnd}
            className={`space-y-4 rounded-xl border p-3 transition-opacity ${
              readToEnd ? 'border-white/10' : 'border-white/5 opacity-40 pointer-events-none select-none'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Step 2 · Sign</p>

            <div>
              <label htmlFor="agreement-signer-name" className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full legal name
              </label>
              <input
                id="agreement-signer-name"
                type="text"
                value={signerName}
                onChange={(e) => {
                  setSignerName(e.target.value);
                  setError(null);
                }}
                disabled={!readToEnd}
                placeholder="As on your ID / W-9"
                className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">Draw signature</label>
                <button type="button" onClick={resetCanvas} className="text-[10px] text-orange-400 font-bold">
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={640}
                height={180}
                className="w-full h-36 rounded-xl border border-white/15 bg-white touch-none cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <p className="text-[10px] text-slate-500 mt-1">Use mouse or finger. Saved to Adaptivity records.</p>
            </div>

            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => {
                  setAck(e.target.checked);
                  setError(null);
                }}
                disabled={!readToEnd}
                className="mt-0.5 rounded border-white/20"
              />
              <span>
                I have read this Independent Contractor Agreement in full and agree to it. My typed name and drawn
                signature are the legal equivalent of a handwritten signature under the E-SIGN Act.
              </span>
            </label>
          </div>

          {error && <p className="text-[11px] text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="button"
            disabled={busy || !readToEnd}
            onClick={() => void submit()}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60"
          >
            {busy ? 'Saving signature…' : 'Sign & save agreement'}
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            You get a copy to keep as soon as you sign, and can reopen it any time from Settings.
          </p>
        </div>
      </div>
    </div>
  );
};
