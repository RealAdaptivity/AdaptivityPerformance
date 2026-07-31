import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  TECH_INSURANCE_RECOMMENDATION,
  TECH_LIABILITY_SUMMARY,
  TECH_WORKERS_COMP_NOTICE,
} from '../../content/contractorLiability';
import { FORM_1099_NEC_NOTICE } from '../../content/taxForms';
import {
  CONTRACTOR_AGREEMENT_VERSION,
  signContractorAgreement,
} from '../../services/contractorAgreement';

type Props = {
  open: boolean;
  onClose: () => void;
  onSigned: (result: { signedAt: string; signerName: string; signaturePath: string }) => void;
};

export const ContractorAgreementSignModal: React.FC<Props> = ({ open, onClose, onSigned }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [signerName, setSignerName] = useState('');
  const [ack, setAck] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSignerName('');
    setAck(false);
    setHasStroke(false);
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f1218';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [open]);

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
  };

  const onPointerUp = () => {
    drawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const submit = async () => {
    setError(null);
    if (!ack) {
      setError('Check the box to confirm you agree to the terms.');
      return;
    }
    if (!hasStroke) {
      setError('Draw your signature in the box.');
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
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#12141c]/px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-white">Sign Independent Contractor Agreement</h3>
            <p className="text-[10px] text-slate-500">Version {CONTRACTOR_AGREEMENT_VERSION} · E-SIGN Act</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 max-h-48 overflow-y-auto space-y-2 text-[11px] text-slate-300 leading-relaxed">
            <p className="font-bold text-slate-200 uppercase tracking-wide text-[10px]">Agreement summary</p>
            <p>
              <strong className="text-white">1. Relationship.</strong> You are a 1099 independent contractor, not an
              employee.
            </p>
            <p>
              <strong className="text-white">2. Liability.</strong> {TECH_LIABILITY_SUMMARY}
            </p>
            <p>{TECH_INSURANCE_RECOMMENDATION}</p>
            <p>
              <strong className="text-white">3. Workers&apos; comp.</strong> {TECH_WORKERS_COMP_NOTICE}
            </p>
            <p>
              <strong className="text-white">4. Tax.</strong> {FORM_1099_NEC_NOTICE}
            </p>
            <p>
              <strong className="text-white">5. Payments.</strong> Customer payments go through Adaptivity (70% tech /
              30% platform + 100% tips). No side cash/Zelle for Adaptivity jobs.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full legal name</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="As on your ID / W-9"
              className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">Draw signature</label>
              <button type="button" onClick={clearSignature} className="text-[10px] text-orange-400 font-bold">
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
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 rounded border-white/20"
            />
            <span>
              I have read this Independent Contractor Agreement and agree that my typed name and drawn signature are
              the legal equivalent of a handwritten signature under the E-SIGN Act.
            </span>
          </label>

          {error && (
            <p className="text-[11px] text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60"
          >
            {busy ? 'Saving signature…' : 'Sign & save agreement'}
          </button>
        </div>
      </div>
    </div>
  );
};
