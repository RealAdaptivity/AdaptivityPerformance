import { supabase } from './supabaseClient';

/** Photos and videos a customer attaches to a booking request.
 *
 *  Optional by design: a car that will not start is a bad moment to ask
 *  someone to film it, so a booking never blocks on an upload. Anything that
 *  fails to upload is reported and skipped rather than failing the booking.
 *
 *  The bucket is private. Anyone may write to it — a booking is taken from
 *  people who are not signed in — but only admin and tech profiles can read,
 *  so an uploaded photo of someone's driveway is not world-readable by URL.
 */

export const BOOKING_MEDIA_BUCKET = 'booking-media';

/** Matches the bucket's own limit, set in the migration. Checked here too so
 *  a 60 MB video is refused instantly instead of after a long upload. */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_FILES = 8;

export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

/** For the file input's accept attribute. image/* and video/* keep the iOS
 *  photo picker usable; the explicit list is what the bucket enforces. */
export const MEDIA_ACCEPT_ATTR = 'image/*,video/*';

export type MediaUploadOutcome = {
  /** Storage paths that uploaded cleanly, to hand to the booking. */
  paths: string[];
  /** Files that did not upload, with the reason, to show the customer. */
  failures: { name: string; reason: string }[];
};

export function describeMediaRejection(file: File): string | null {
  if (file.size > MAX_MEDIA_BYTES) {
    return `${(file.size / 1024 / 1024).toFixed(0)} MB is over the 50 MB limit`;
  }
  if (!file.type) return 'unrecognised file type';
  if (!ACCEPTED_MEDIA_TYPES.includes(file.type as (typeof ACCEPTED_MEDIA_TYPES)[number])) {
    return 'only photos and videos can be attached';
  }
  return null;
}

/** Keeps the original extension so the browser and the tech portal can tell a
 *  video from a photo, and drops everything else from the customer's filename:
 *  it is their file, and it can carry anything. */
function safeObjectPath(file: File, folder: string, index: number): string {
  const ext = (file.name.match(/\.([A-Za-z0-9]{1,8})$/)?.[1] ?? 'bin').toLowerCase();
  return `${folder}/${String(index + 1).padStart(2, '0')}.${ext}`;
}

/** A per-submission folder. The booking reference does not exist until the
 *  booking is created, so this is generated first and stored on the row. */
export function newMediaFolder(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${stamp}/${rand}`;
}

export async function uploadBookingMedia(
  files: File[],
  folder: string
): Promise<MediaUploadOutcome> {
  const paths: string[] = [];
  const failures: { name: string; reason: string }[] = [];

  for (const [index, file] of files.slice(0, MAX_MEDIA_FILES).entries()) {
    const rejection = describeMediaRejection(file);
    if (rejection) {
      failures.push({ name: file.name, reason: rejection });
      continue;
    }
    const path = safeObjectPath(file, folder, index);
    const { error } = await supabase.storage
      .from(BOOKING_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      failures.push({ name: file.name, reason: error.message });
      continue;
    }
    paths.push(path);
  }

  return { paths, failures };
}

/** Short-lived links to what a customer attached, for staff to view. The
 *  bucket is private; its read policy lets techs and admins sign these. */
export async function signedMediaUrls(paths: string[]): Promise<{ path: string; url: string; isVideo: boolean }[]> {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage.from(BOOKING_MEDIA_BUCKET).createSignedUrls(paths, 60 * 30);
  if (error || !data) return [];
  return data.flatMap((d) =>
    d.signedUrl && d.path ? [{ path: d.path, url: d.signedUrl, isVideo: /\.(mp4|mov|webm)$/i.test(d.path) }] : []
  );
}
