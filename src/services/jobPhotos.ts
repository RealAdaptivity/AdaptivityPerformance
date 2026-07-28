import { supabase } from './supabaseClient';

export type JobPhotoKind = 'before' | 'after' | 'dvi' | 'other';

export type JobPhoto = {
  id: string;
  bookingId: string;
  storagePath: string;
  kind: JobPhotoKind;
  caption: string | null;
  createdAt: string;
  publicUrl: string;
};

function publicUrlFor(path: string): string {
  const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchJobPhotos(bookingId: string): Promise<JobPhoto[]> {
  const { data, error } = await supabase
    .from('booking_job_photos')
    .select('id, booking_id, storage_path, kind, caption, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id as string,
    bookingId: row.booking_id as string,
    storagePath: row.storage_path as string,
    kind: row.kind as JobPhotoKind,
    caption: (row.caption as string | null) ?? null,
    createdAt: row.created_at as string,
    publicUrl: publicUrlFor(row.storage_path as string),
  }));
}

export async function fetchJobPhotosByReference(referenceCode: string): Promise<JobPhoto[]> {
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('reference_code', referenceCode.trim())
    .maybeSingle();
  if (bErr) throw bErr;
  if (!booking?.id) return [];
  try {
    return await fetchJobPhotos(booking.id as string);
  } catch {
    return [];
  }
}

/** Upload a File (web) and insert booking_job_photos row. */
export async function uploadJobPhoto(opts: {
  bookingId: string;
  file: File;
  kind?: JobPhotoKind;
  caption?: string;
}): Promise<JobPhoto> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required to upload photos');

  const ext = opts.file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${opts.bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage.from('job-photos').upload(path, opts.file, {
    contentType: opts.file.type || 'image/jpeg',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from('booking_job_photos')
    .insert({
      booking_id: opts.bookingId,
      uploaded_by: user.id,
      storage_path: path,
      kind: opts.kind || 'dvi',
      caption: opts.caption?.trim() || null,
    })
    .select('id, booking_id, storage_path, kind, caption, created_at')
    .single();
  if (insErr) throw insErr;

  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    storagePath: row.storage_path as string,
    kind: row.kind as JobPhotoKind,
    caption: (row.caption as string | null) ?? null,
    createdAt: row.created_at as string,
    publicUrl: publicUrlFor(row.storage_path as string),
  };
}
