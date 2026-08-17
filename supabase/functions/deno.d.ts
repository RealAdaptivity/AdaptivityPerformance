declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module 'jsr:@supabase/functions-js/edge-runtime.d.ts' {}
declare module 'jsr:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
