type Props = { onBookService: () => void };

const PAST = [
  { id: '1', title: 'Front brake service', date: 'Jun 12, 2026', total: 412, ref: 'AP-7721' },
  { id: '2', title: 'Synthetic oil & DVI', date: 'Mar 3, 2026', total: 189, ref: 'AP-6904' },
];

const RECOMMENDED = [
  { id: 'r1', title: 'Coolant flush (due 8k mi)', urgency: 'warning' as const },
  { id: 'r2', title: 'Cabin air filter', urgency: 'good' as const },
];

export const CustomerHistoryTab: React.FC<Props> = ({ onBookService }) => (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-white mb-3">Past services</h3>
      {PAST.map((row) => (
        <div key={row.id} className="bg-[#12141c] border border-white/10 rounded-xl p-3 mb-2 flex justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{row.title}</p>
            <p className="text-[11px] text-slate-500">
              {row.date} · {row.ref}
            </p>
          </div>
          <span className="text-sm font-bold text-emerald-400">${row.total}</span>
        </div>
      ))}
    </section>
    <section>
      <h3 className="text-sm font-bold text-white mb-3">Recommended</h3>
      {RECOMMENDED.map((row) => (
        <div key={row.id} className="bg-[#12141c] border border-white/10 rounded-xl p-3 mb-2 flex justify-between items-center">
          <p className="text-sm text-slate-200">{row.title}</p>
          <button type="button" onClick={onBookService} className="text-[11px] font-bold text-orange-400">
            Book →
          </button>
        </div>
      ))}
    </section>
    <p className="text-[10px] text-slate-600">Receipt PDF download matches mobile app (coming soon on web).</p>
  </div>
);
