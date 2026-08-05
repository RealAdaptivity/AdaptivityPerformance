import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

const PENDING_BOOKING_KEY = 'adaptivity_pending_guest_booking';

export function stashPendingGuestBooking(bookingReference: string) {
  if (typeof window === 'undefined' || !bookingReference.trim()) return;
  sessionStorage.setItem(PENDING_BOOKING_KEY, bookingReference.trim());
}

export function peekPendingGuestBooking(): string | null {
  if (typeof window === 'undefined') return null;
  const v = sessionStorage.getItem(PENDING_BOOKING_KEY);
  return v?.trim() || null;
}

export function clearPendingGuestBooking() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_BOOKING_KEY);
}

export async function linkGuestBooking(bookingReference: string): Promise<{
  ok: boolean;
  alreadyLinked?: boolean;
  bookingId?: string;
}> {
  return invokeEdgeFunction('link-guest-booking', {
    bookingReference: bookingReference.trim(),
  });
}

/** Link a stashed post-booking signup reference, if any. Best-effort; clears stash on success. */
export async function claimPendingGuestBooking(): Promise<void> {
  const ref = peekPendingGuestBooking();
  if (!ref) return;
  try {
    await linkGuestBooking(ref);
    clearPendingGuestBooking();
  } catch (err) {
    console.warn('[claimPendingGuestBooking]', err);
  }
}

export async function updateProfilePhone(userId: string, phone: string): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('profiles').update({ phone: trimmed }).eq('id', userId);
  if (error) {
    console.warn('[updateProfilePhone]', error.message);
  }
}
