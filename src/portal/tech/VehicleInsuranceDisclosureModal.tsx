import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Car, X } from 'lucide-react';
import {
  COMPANY_REPRESENTATIVE_NAME,
  COMPANY_REPRESENTATIVE_TITLE,
  DISCLOSURE_ACKNOWLEDGEMENT,
  DISCLOSURE_FIELDS,
  DISCLOSURE_INTRO,
  DISCLOSURE_SECTIONS,
  DISCLOSURE_TITLE,
  VEHICLE_INSURANCE_DISCLOSURE_VERSION,
} from '../../content/vehicleInsuranceDisclosure';
import {
  EMPTY_DISCLOSURE,
  signVehicleInsuranceDisclosure,
  validateDisclosure,
  type DisclosureFieldError,
  type DisclosureValues,
} from '../../services/vehicleInsuranceDisclosure';

type Props = {
  open: boolean;
  onClose: () => void;
  onSigned: (result: { signedAt: string; signerName: string; signaturePath: string }) => void;
  /** Pre-fills the disclosure when re-signing after a renewal, so the
   *  technician retypes only what actually changed. */
  initialValues?: DisclosureValues | null;
};

/**
 * Read, disclose, then sign — in that order.
 *
 * The same shape as the contractor agreement signer: the terms come first and
 * the signing controls stay locked until they have been scrolled through, so
 * nobody can certify they have read something that was never on screen.
 */
export const VehicleInsuranceDisclosureModal: React.FC<Props> = ({
  open,
  onClose,
  onSigned,
  initialValues,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const termsRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const [values, setValues] = useState<DisclosureValues>(EMPTY_DISCLOSURE);
  const [signerName, setSignerName] = useState('');
  const [ack, setAck] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

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
    // A renewal keeps the vehicle and carrier; only the policy dates move.
    setValues(initialValues ? { ...initialValues, policyExpiresOn: '' } : EMPTY_DISCLOSURE);
    setSignerName('');
    setAck(false);
    setReadToEnd(false);
    setError(null);
    setFieldErrors({});
    resetCanvas();
    if (termsRef.current) termsRef.current.scrollTop = 0;
  }, [open, initialValues, resetCanvas]);

  /** On a tall screen the terms may not overflow at all. "Nothing to scroll"
   *  counts as read rather than leaving a control that never unlocks. */
  const checkRead = useCallback(() => {
    const el = termsRef.current;
    if (!el) return;
    const slack = 24;
    if (el.scrollHeight - el.clientHeight <= slack || el.scrollTop + el.clientHeight >= el.scrollHeight - slack) {
      setReadToEnd(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(checkRead);
    return () => window.cancelAnimationFrame(id);
  }, [open, checkRead]);

  if (!open) return null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
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

  const setField = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setError(null);
    if (!readToEnd) {
      setError('Scroll to the end of the agreement before signing.');
      return;
    }
    const dataUrl = hasStroke ? canvasRef.current?.toDataURL('image/png') || '' : '';
    const problems: DisclosureFieldError[] = validateDisclosure(values, signerName, dataUrl);
    if (problems.length) {
      const byField: Partial<Record<string, string>> = {};
      for (const p of problems) byField[p.field] = p.message;
      setFieldErrors(byField);
      setError('Check the highlighted fields.');
      return;
    }
    if (!ack) {
      setError('Tick the acknowledgement to certify the statement above.');
      return;
    }

    setBusy(true);
    try {
      const result = await signVehicleInsuranceDisclosure({
        values,
        signerName,
        signatureDataUrl: dataUrl,
      });
      onSigned(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not file your disclosure');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = (key: string) =>
    `w-full bg-[#0b0c10] border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none ${
      fieldErrors[key] ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'
    }`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#12141c] w-full sm:max-w-2xl max-h-[95vh] rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Car className="w-5 h-5 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{DISCLOSURE_TITLE}</h2>
              <p className="text-[10px] text-slate-500">Version {VEHICLE_INSURANCE_DISCLOSURE_VERSION}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            ref={termsRef}
            onScroll={checkRead}
            className="max-h-[38vh] overflow-y-auto p-4 space-y-4 text-xs text-slate-300 leading-relaxed border-b border-white/10"
          >
            <p>{DISCLOSURE_INTRO}</p>
            {DISCLOSURE_SECTIONS.map((section) => (
              <div key={section.heading} className="space-y-1.5">
                <h3 className="text-xs font-bold text-white">{section.heading}</h3>
                {section.blocks.map((block, i) =>
                  block.kind === 'p' ? (
                    <p key={i}>{block.text}</p>
                  ) : (
                    <ul key={i} className="list-disc pl-4 space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            ))}
            {!readToEnd && (
              <p className="text-[10px] text-amber-400 font-semibold">Scroll to the end to unlock signing.</p>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white mb-2">Vehicle & Insurance Disclosure</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {DISCLOSURE_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === 'licensePlateState' ? '' : 'col-span-2 sm:col-span-1'}>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1" htmlFor={`vid-${f.key}`}>
                      {f.label}
                    </label>
                    <input
                      id={`vid-${f.key}`}
                      type={f.type}
                      maxLength={f.maxLength}
                      value={values[f.key]}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setField(
                          f.key,
                          f.key === 'licensePlateState' ? e.target.value.toUpperCase() : e.target.value
                        )
                      }
                      className={inputClass(f.key)}
                    />
                    {fieldErrors[f.key] && (
                      <p className="text-[10px] text-red-400 mt-1">{fieldErrors[f.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-black/40 border border-white/10 rounded-xl p-3">
              {DISCLOSURE_ACKNOWLEDGEMENT}
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1" htmlFor="vid-signer">
                Your Full Legal Name
              </label>
              <input
                id="vid-signer"
                value={signerName}
                onChange={(e) => {
                  setSignerName(e.target.value);
                  setFieldErrors((x) => ({ ...x, signerName: undefined }));
                }}
                placeholder="As it appears on your ID"
                className={inputClass('signerName')}
              />
              {fieldErrors.signerName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.signerName}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400">Signature</span>
                <button type="button" onClick={resetCanvas} className="text-[10px] text-orange-400 font-semibold">
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={640}
                height={180}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => (drawing.current = false)}
                onPointerLeave={() => (drawing.current = false)}
                className={`w-full h-[120px] rounded-xl bg-white touch-none ${
                  readToEnd ? 'cursor-crosshair' : 'opacity-50 cursor-not-allowed'
                } ${fieldErrors.signature ? 'ring-2 ring-red-500/70' : ''}`}
              />
              {fieldErrors.signature && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.signature}</p>}
            </div>

            {/* Countersigned by the company. Pre-filled, and not editable by the
                signer — it records who accepted on the company's behalf. */}
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 mb-0.5">Company Representative</div>
                <div className="font-bold text-white">{COMPANY_REPRESENTATIVE_NAME}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 mb-0.5">Title</div>
                <div className="font-bold text-white">{COMPANY_REPRESENTATIVE_TITLE}</div>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                disabled={!readToEnd}
                className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0"
              />
              <span className="text-[11px] text-slate-300 leading-relaxed">
                I have read this agreement, my insurer has been notified of my business use, and I will keep active
                primary coverage while performing work.
              </span>
            </label>

            {error && (
              <p className="text-[11px] text-red-400 font-semibold" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !readToEnd}
              className="w-full py-3.5 rounded-2xl bg-orange-500 disabled:bg-slate-700 disabled:text-slate-400 text-[#12141c] text-sm font-black flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {busy ? 'Filing…' : 'Sign & file disclosure'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
