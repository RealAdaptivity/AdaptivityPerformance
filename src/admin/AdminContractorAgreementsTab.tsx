import { useCallback, useEffect, useState } from 'react';
import {
  fetchSignedContractorAgreements,
  getContractorAgreementSignatureUrl,
  type ContractorAgreementRecord,
} from '../services/contractorAgreement';
import { openContractorAgreementPrintWindow } from '../services/contractorAgreementPdf';

export function AdminContractorAgreementsTab() {
  const [rows, setRows] = useState<ContractorAgreementRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setRows(await fetchSignedContractorAgreements());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agreements');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openSignedPdf = async (row: ContractorAgreementRecord) => {
    setOpeningId(row.profileId);
    try {
      let signatureDataUrl: string | null = null;
      if (row.signaturePath) {
        signatureDataUrl = await getContractorAgreementSignatureUrl(row.signaturePath);
      }
      openContractorAgreementPrintWindow({
        signedAt: row.signedAt,
        signerName: row.signerName ?? undefined,
        signatureImageUrl: signatureDataUrl,
        agreementVersion: row.agreementVersion,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open PDF');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Contractor agreements</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Digitally signed Independent Contractor Agreements. Each PDF includes the typed name and drawn
            signature stored in private storage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-2 rounded-lg border border-white/15 text-xs text-slate-200 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {busy ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No signed agreements yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 font-semibold">Tech</th>
                <th className="px-3 py-2 font-semibold">Signer</th>
                <th className="px-3 py-2 font-semibold">Signed</th>
                <th className="px-3 py-2 font-semibold">Signature</th>
                <th className="px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.profileId} className="border-t border-white/10 text-slate-200">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-white">{row.fullName || '—'}</div>
                    <div className="text-slate-500">{row.email || row.profileId.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2.5">{row.signerName || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {row.signedAt ? new Date(row.signedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.signaturePath ? (
                      <span className="text-emerald-400">On file</span>
                    ) : (
                      <span className="text-amber-400">Legacy (no image)</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={openingId === row.profileId}
                      onClick={() => void openSignedPdf(row)}
                      className="px-3 py-1.5 rounded-lg border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
                    >
                      {openingId === row.profileId ? 'Opening…' : 'View / print PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
