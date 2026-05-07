import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for route handlers, server actions, and server
// components. Reads/writes auth cookies via Next's cookies() helper.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // setAll may be called from a server component where setting cookies
          // is illegal — swallow the error so the rest of the response succeeds.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
