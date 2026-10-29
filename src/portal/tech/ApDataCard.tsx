import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { apDataJobUrl } from '../../config/apData';
import { fetchJobFixes, type JobFix } from '../../services/apDataFixes';
import { capClass, cardClass } from './techUi';

/**
 * The job's link into AP Data: opens it with this vehicle, the customer's
 * words and the job reference, and lists the confirmed fixes a tech recorded
 * there for this job.
 */
export const ApDataCard: React.FC<{ referenceCode: string; vin: string | null; vehicle: string; issue: string | null }> = ({ referenceCode, vin, vehicle, issue }) => {
  const [fixes, setFixes] = useState<JobFix[]>([]);
  useEffect(() => {
    let live = true;
    fetchJobFixes(referenceCode)
      .then((f) => live && setFixes(f))
      .catch(() => live && setFixes([]));
    return () => {
      live = false;
    };
  }, [referenceCode]);

  return (
    <div className={`${cardClass} space-y-3 p-4`}>
      <div className="flex items-center gap-2">
        <BookOpen className="h-[18px] w-[18px] text-brand" aria-hidden="true" />
        <p className={capClass}>Repair info</p>
      </div>
      <a
        href={apDataJobUrl({ referenceCode, vin, vehicle, issueDescription: issue })}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-brand font-semibold text-white"
      >
        Open in AP Data <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="text-xs text-slate-400">Codes, confirmed fixes, locations and labor for this vehicle. Record the fix there and it shows here.</p>
      {fixes.length > 0 && (
        <ul className="space-y-2">
          {fixes.map((f) => (
            <li key={f.id} className="rounded-xl bg-[#0b0c10] px-3.5 py-3">
              <p className="text-sm font-semibold">{f.rootCause}</p>
              <p className="text-sm text-slate-300">Fix: {f.fix}</p>
              {f.codes.length > 0 && <p className="text-xs text-slate-500">{f.codes.join(' · ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
