import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, Mail, MessageSquare, Phone, RotateCcw, Star } from 'lucide-react';
import { fetchInquiries, setInquiryStatus, type Inquiry, type InquiryStatus } from '../services/inbox';

type Filter = 'open' | 'all';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const telOf = (phone: string) => phone.replace(/[^\d+]/g, '');

const STATUS_LABEL: Record<InquiryStatus, string> = { new: 'New', replied: 'Replied', closed: 'Closed' };

/**
 * Messages from the Contact Us form and membership requests. Before this they
 * were saved and never shown to anyone.
 */
export const InboxAdmin: React.FC<{ adminId?: string; onChanged?: () => void }> = ({ adminId, onChanged }) => {
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await fetchInquiries());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () => (items ?? []).filter((q) => (filter === 'open' ? q.status !== 'closed' : true)),
    [items, filter]
  );
  const newCount = (items ?? []).filter((q) => q.status === 'new').length;

  const mark = async (q: Inquiry, status: InquiryStatus) => {
    setBusyId(q.id);
    try {
      await setInquiryStatus(q.id, status, adminId);
      setItems((cur) => (cur ?? []).map((x) => (x.id === q.id ? { ...x, status, handledAt: status === 'new' ? null : new Date().toISOString() } : x)));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-400" /> Inbox
          </h1>
          <p className="text-xs text-slate-400">
            Messages from the Contact Us form and membership requests.{' '}
            {newCount > 0 ? `${newCount} waiting on a reply.` : 'Nothing waiting on a reply.'}
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 bg-[#12141c]" role="group" aria-label="Show">
          {(['open', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 text-[11px] font-bold rounded-md ${filter === f ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
            >
              {f === 'open' ? 'Open' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading messages…
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-white/10 rounded-xl px-4 py-8 text-center">
          {filter === 'open' ? 'No open messages.' : 'No messages yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((q) => (
            <li
              key={q.id}
              className={`rounded-xl border p-4 space-y-3 ${q.status === 'new' ? 'border-orange-500/40 bg-orange-500/[0.04]' : 'border-white/10 bg-[#12141c]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white flex flex-wrap items-center gap-2">
                    {q.fullName}
                    {q.topic === 'membership' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                        <Star className="w-3 h-3" /> Membership request
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">{when(q.createdAt)}</p>
                </div>
                <span
                  className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                    q.status === 'new'
                      ? 'text-orange-300 border-orange-500/40'
                      : q.status === 'replied'
                        ? 'text-emerald-300 border-emerald-500/40'
                        : 'text-slate-400 border-white/15'
                  }`}
                >
                  {STATUS_LABEL[q.status]}
                </span>
              </div>

              {q.vehicle && <p className="text-xs text-slate-400">Vehicle: <span className="text-slate-200">{q.vehicle}</span></p>}
              <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{q.message}</p>

              <div className="flex flex-wrap gap-2">
                {q.phone && (
                  <a
                    href={`tel:${telOf(q.phone)}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[11px] font-bold text-slate-200 hover:border-white/30"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call {q.phone}
                  </a>
                )}
                {q.phone && q.smsConsent !== false && (
                  <a
                    href={`sms:${telOf(q.phone)}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[11px] font-bold text-slate-200 hover:border-white/30"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Text
                  </a>
                )}
                {q.email && (
                  <a
                    href={`mailto:${q.email}?subject=${encodeURIComponent('Adaptivity Performance')}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[11px] font-bold text-slate-200 hover:border-white/30"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                )}
              </div>
              {q.phone && q.smsConsent === false && (
                <p className="text-[11px] text-amber-300">They didn’t agree to texts: call or email instead.</p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                {q.status === 'new' && (
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void mark(q, 'replied')}
                    className="min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Mark replied
                  </button>
                )}
                {q.status !== 'closed' && (
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void mark(q, 'closed')}
                    className="min-h-[36px] rounded-lg border border-white/15 px-3 text-[11px] font-bold text-slate-300 hover:border-white/30 disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {q.status !== 'new' && (
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void mark(q, 'new')}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 px-3 text-[11px] font-bold text-slate-400 hover:border-white/30 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" /> Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
