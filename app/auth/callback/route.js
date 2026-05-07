import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the magic-link redirect. Supabase appends ?code=... to the URL.
// We exchange that for a session cookie, then redirect to the user's
// originally-requested page (or /).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=missing-code`);
}
