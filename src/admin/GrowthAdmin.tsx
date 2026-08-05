import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  MessageSquare,
  Newspaper,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { FALLBACK_BLOG_POSTS, blogPath } from '../services/blog';
import { CITY_LANDINGS, GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY } from '../site/seo';
import {
  exportPartnerReportCsv,
  fetchDueReviewAsks,
  fetchExpiringHolds,
  fetchFraudFlags,
  fetchGbpDrafts,
  markReviewAskSent,
  setGbpDraftStatus,
  type FraudFlag,
} from '../services/adminOpsExtras';

const CITY_KEYWORDS = CITY_LANDINGS.slice(0, 5)
  .map((c) => c.city)
  .join(', ');

function reviewSmsBody(customerName: string, reference: string) {
  const first = customerName.split(' ')[0] || 'there';
  return `Hi ${first} — thanks for choosing Adaptivity Performance (job ${reference}). Mind leaving a quick Google review? ${GOOGLE_REVIEW_URL}`;
}

export const GrowthAdmin: React.FC = () => {
  const [drafts, setDrafts] = useState<
    Array<{ id: string; city_slug: string | null; caption: string; created_at: string }>
  >([]);
  const [reviewAsks, setReviewAsks] = useState<
    Array<{
      id: string;
      reference_code: string;
      customer_name: string;
      customer_phone: string | null;
      review_ask_due_at: string | null;
    }>
  >([]);
  const [holds, setHolds] = useState<
    Array<{
      reference_code: string;
      customer_name: string;
      customer_phone: string | null;
      hold_expires_at: string | null;
    }>
  >([]);
  const [fraud, setFraud] = useState<FraudFlag[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMsg(null);
    try {
      const [d, r, h, f] = await Promise.all([
        fetchGbpDrafts(),
        fetchDueReviewAsks(),
        fetchExpiringHolds(72),
        fetchFraudFlags(),
      ]);
      setDrafts(d as typeof drafts);
      setReviewAsks(r as typeof reviewAsks);
      setHolds(h as typeof holds);
      setFraud(f);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load growth data');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCaption = async (id: string, caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      await setGbpDraftStatus(id, 'copied');
      setMsg('Caption copied — paste into Google Business.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Copy failed');
    }
  };

  const openReviewSms = async (row: (typeof reviewAsks)[0]) => {
    const phone = (row.customer_phone || '').replace(/\D/g, '');
    const body = encodeURIComponent(reviewSmsBody(row.customer_name, row.reference_code));
    const href = phone ? `sms:${phone}?body=${body}` : `sms:?body=${body}`;
    window.location.href = href;
    try {
      await markReviewAskSent(row.id);
      await load();
    } catch {
      /* still opened composer */
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400 leading-relaxed">
        Growth ops — GBP drafts from completed jobs, review SMS asks (device composer until Twilio),
        hold-expiry reminders, and light fraud flags.
      </p>
      {msg && (
        <p className="text-xs text-orange-200 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-violet-300" />
            GBP post drafts
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[11px] font-bold text-slate-400 hover:text-white"
          >
            Refresh
          </button>
        </div>
        {drafts.length === 0 ? (
          <p className="text-xs text-slate-500">No drafts yet — they appear after job captures.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500">
                  {d.city_slug || 'dfw'} · {new Date(d.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{d.caption}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyCaption(d.id, d.caption)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-300"
                  >
                    <Copy className="w-3 h-3" /> Copy for GBP
                  </button>
                  <button
                    type="button"
                    onClick={() => void setGbpDraftStatus(d.id, 'dismissed').then(load)}
                    className="text-[11px] font-bold text-slate-500"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-3">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          Review SMS due (2h after complete)
        </p>
        {reviewAsks.length === 0 ? (
          <p className="text-xs text-slate-500">None due.</p>
        ) : (
          <ul className="space-y-2">
            {reviewAsks.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b0c10] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {r.customer_name} · {r.reference_code}
                  </p>
                  <p className="text-[10px] text-slate-500">{r.customer_phone || 'No phone'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void openReviewSms(r)}
                  className="shrink-0 text-[11px] font-bold text-orange-300 border border-orange-500/30 rounded-lg px-2.5 py-1.5"
                >
                  Open SMS
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-3">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Holds expiring (72h)
        </p>
        {holds.length === 0 ? (
          <p className="text-xs text-slate-500">No holds near expiry.</p>
        ) : (
          <ul className="space-y-1.5">
            {holds.map((h) => (
              <li key={h.reference_code} className="text-xs text-slate-300 flex justify-between gap-2">
                <span className="font-mono text-slate-400">{h.reference_code}</span>
                <span className="truncate">{h.customer_name}</span>
                <span className="text-amber-300 shrink-0">
                  {h.hold_expires_at ? new Date(h.hold_expires_at).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-3">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Fraud / trust flags (90d)
        </p>
        {fraud.length === 0 ? (
          <p className="text-xs text-slate-500">No flags.</p>
        ) : (
          <ul className="space-y-2">
            {fraud.map((f) => (
              <li key={f.key} className="text-xs rounded-lg border border-white/10 px-3 py-2">
                <span
                  className={`font-bold ${
                    f.severity === 'high'
                      ? 'text-red-300'
                      : f.severity === 'med'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                  }`}
                >
                  {f.label}
                </span>
                <p className="text-slate-500 mt-0.5">{f.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
        <p className="text-sm font-bold text-white">Exports</p>
        <button
          type="button"
          onClick={() =>
            void exportPartnerReportCsv()
              .then(() => setMsg('Partner CSV downloaded'))
              .catch((e) => setMsg(e instanceof Error ? e.message : 'Export failed'))
          }
          className="text-xs font-bold text-sky-300 border border-sky-500/30 rounded-lg px-3 py-2"
        >
          Download partner report CSV
        </button>
      </section>

      <ul className="space-y-3">
        <li className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-bold text-white">Ask for a review after every job</p>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-300 hover:text-orange-200"
              >
                Open review link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </li>
        <li className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Weekly GBP ideas</p>
              <p className="text-xs text-slate-400">
                Photo + city keyword ({CITY_KEYWORDS}). Tip: “What a $85 diagnostic hold covers.”
              </p>
            </div>
          </div>
        </li>
        <li className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">NAP</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adaptivity Performance · 410 FM 156, Justin TX 76247 · {SITE_PHONE_DISPLAY}
              </p>
            </div>
          </div>
        </li>
        <li className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
          <p className="text-sm font-bold text-white">Blog seeds</p>
          <ul className="space-y-1.5">
            {FALLBACK_BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <a
                  href={blogPath(post.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-orange-300 hover:underline"
                >
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
};
