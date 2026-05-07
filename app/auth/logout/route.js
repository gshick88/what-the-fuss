import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 });
}

// Allow GET too so a simple <a href="/auth/logout"> works.
export async function GET(request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login', request.url));
}
