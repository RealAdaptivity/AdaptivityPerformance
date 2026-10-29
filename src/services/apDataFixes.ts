import { supabase } from './supabaseClient';

/** A confirmed fix recorded in AP Data for an Adaptivity job (repair_fixes.job_ref). */
export type JobFix = { id: string; rootCause: string; fix: string; codes: string[]; createdAt: string };

export async function fetchJobFixes(referenceCode: string): Promise<JobFix[]> {
  const { data, error } = await supabase
    .from('repair_fixes')
    .select('id, root_cause, fix, dtc_codes, created_at')
    .eq('job_ref', referenceCode)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    rootCause: r.root_cause as string,
    fix: r.fix as string,
    codes: (r.dtc_codes as string[] | null) ?? [],
    createdAt: r.created_at as string,
  }));
}
