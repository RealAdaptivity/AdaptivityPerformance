import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  claimBookingRow,
  fetchDispatchBookings,
  fetchMyTechSpecialties,
  releaseJob,
  subscribeDispatchBookings,
  updateBookingRow,
  type DispatchBooking,
} from '../../services/techDispatch';
import { clockIn, clockOut, fetchMyShiftStatus, type ShiftStatus } from '../../services/techShifts';

/** Everything the tech screens read and do, in one place so each screen stays layout. */
export function useTechJobs() {
  const [jobs, setJobs] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>(['mechanical']);
  const [shift, setShift] = useState<ShiftStatus>({ onShift: false, since: null });
  const [shiftBusy, setShiftBusy] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const rows = await fetchDispatchBookings();
      setJobs(rows.filter((j) => j.status !== 'CANCELED'));
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not load jobs' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadShift = useCallback(async () => {
    try {
      setShift(await fetchMyShiftStatus());
    } catch {
      /* the claim itself enforces the shift; a failed read leaves the banner as it was */
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMe(data.session?.user?.id ?? null));
    void fetchMyTechSpecialties().then(setSpecialties);
    void load();
    void loadShift();
    const ch = subscribeDispatchBookings(() => void load());
    return () => {
      void ch.unsubscribe();
    };
  }, [load, loadShift]);

  const toggleShift = async () => {
    setShiftBusy(true);
    setNotice(null);
    try {
      if (shift.onShift) {
        await clockOut();
        setNotice({ tone: 'ok', text: 'Clocked out. Clock back in to claim jobs.' });
      } else {
        await clockIn();
        setNotice({ tone: 'ok', text: 'Clocked in — you can claim jobs now.' });
      }
      await loadShift();
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not update your shift' });
    } finally {
      setShiftBusy(false);
    }
  };

  /** Returns true when the claim went through. */
  const claim = async (job: DispatchBooking): Promise<boolean> => {
    let uid = me;
    if (!uid) {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user?.id ?? null;
      setMe(uid);
    }
    if (!uid) {
      setNotice({ tone: 'warn', text: 'Sign in again to claim this job.' });
      return false;
    }
    setBusyJobId(job.id);
    setNotice(null);
    try {
      await claimBookingRow(job.referenceCode, uid);
      await load();
      return true;
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not claim this job' });
      return false;
    } finally {
      setBusyJobId(null);
    }
  };

  const markArrived = async (job: DispatchBooking) => {
    setBusyJobId(job.id);
    try {
      await updateBookingRow(job.referenceCode, { status: 'ON_SITE', distance_miles: 0, eta_minutes: 0 });
      await load();
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not update the job' });
    } finally {
      setBusyJobId(null);
    }
  };

  const release = async (job: DispatchBooking): Promise<boolean> => {
    setBusyJobId(job.id);
    try {
      await releaseJob(job.referenceCode);
      await load();
      setNotice({ tone: 'ok', text: 'Job released back to the open list.' });
      return true;
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not release the job' });
      return false;
    } finally {
      setBusyJobId(null);
    }
  };

  return {
    jobs,
    loading,
    refreshing,
    me,
    specialties,
    shift,
    shiftBusy,
    busyJobId,
    notice,
    setNotice,
    load,
    toggleShift,
    claim,
    markArrived,
    release,
  };
}

export type TechJobsApi = ReturnType<typeof useTechJobs>;
