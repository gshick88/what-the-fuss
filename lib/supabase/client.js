'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. Reads/writes auth cookies via the browser.
// Use this in 'use client' components and hooks.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
