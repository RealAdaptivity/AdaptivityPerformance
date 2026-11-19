import React from 'react';
import { formatCents, PARTS_PICKUP_PERCENT } from '../../services/closeOut';
import type { WorkOrder } from '../../services/workOrder';
import { capClass, cardClass } from './techUi';

/** What the vehicle needs, as written up on the phone call, with the
 *  estimate and the tech's payout on it. */
export const WorkOrderCard: React.FC<{ order: WorkOrder; totalCents: number | null; payoutCents: number | null }> = ({
  order,
  totalCents,
  payoutCents,
}) => (
  <div className={`${cardClass} space-y-2.5 p-4`}>
    <p className={capClass}>Work order</p>
    <ul className="space-y-2">
      {order.lines.map((l, i) => (
        <li key={i} className="rounded-xl bg-[#0b0c10] px-3.5 py-2.5">
          <p className="text-[15px] font-semibold">{l.title}</p>
          <p className="text-sm text-slate-400">
            Part {formatCents(l.partsCents)} · Labor {formatCents(l.laborCents)}
          </p>
        </li>
      ))}
    </ul>
    <p className="text-sm text-slate-300">{order.partsPickup ? `${PARTS_PICKUP_PERCENT}% parts pickup fee on` : 'No parts pickup fee'}</p>
    {totalCents != null && (
      <p className="flex justify-between text-[15px] font-semibold">
        <span>Estimate with diagnostic, travel &amp; tax</span>
        <span className="font-heading">{formatCents(totalCents)}</span>
      </p>
    )}
    {payoutCents != null && (
      <p className="flex justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-[15px] font-bold text-emerald-200">
        <span>Your payout</span>
        <span className="font-heading">{formatCents(payoutCents)}</span>
      </p>
    )}
  </div>
);
