import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/** Read `{ error: string }` from a failed edge function invoke (non-2xx). */
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* ignore parse errors */
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage(error, `Edge function ${name} failed`));
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

/** Normalize Postgrest / Auth / plain objects into Error so UI never shows a blank fallback. */
export function asError(e: unknown, fallback: string): Error {
  if (e instanceof Error && e.message.trim()) return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: unknown }).message || '').trim();
    if (m) return new Error(m);
  }
  if (typeof e === 'string' && e.trim()) return new Error(e);
  return new Error(fallback);
}
