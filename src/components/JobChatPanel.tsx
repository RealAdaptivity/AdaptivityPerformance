import React, { useCallback, useEffect, useState } from 'react';
import { fetchJobMessages, sendJobMessage, subscribeJobMessages, type JobMessage } from '../services/jobChat';

type Props = {
  bookingId: string;
  selfId: string | null;
  title?: string;
};

export const JobChatPanel: React.FC<Props> = ({ bookingId, selfId, title = 'Job chat' }) => {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchJobMessages(bookingId);
      setMessages(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load chat');
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
    const channel = subscribeJobMessages(bookingId, () => void load());
    return () => {
      void channel.unsubscribe();
    };
  }, [bookingId, load]);

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendJobMessage(bookingId, draft);
      setDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1118] p-3 space-y-2">
      <p className="text-[10px] uppercase font-bold text-slate-500">{title}</p>
      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <p className="text-[11px] text-slate-500">No messages yet — ask about ETA, gate codes, or parking.</p>
        )}
        {messages.map((m) => {
          const mine = selfId && m.senderId === selfId;
          return (
            <div
              key={m.id}
              className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[90%] ${
                mine ? 'ml-auto bg-orange-500/20 text-orange-100' : 'bg-white/5 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message…"
          className="flex-1 bg-[#12141c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
          maxLength={2000}
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => void send()}
          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-orange-500 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};
