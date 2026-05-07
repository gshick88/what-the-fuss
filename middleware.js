import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Protect every route except auth + statics. Anyone hitting / or /chat etc
// without a valid session gets bounced to /auth/login. Also refreshes the
// auth cookies on every request so the session stays alive.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if it's expired. Required for SSR.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/auth');
  const isApiRoute = path.startsWith('/api');

  // API routes guard themselves.
  if (isApiRoute) return response;

  // Auth routes: if you're already signed in, /auth/login → /
  if (isAuthRoute) {
    if (user && path === '/auth/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.delete('next');
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Everything else requires a session.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    if (path !== '/') url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Match everything except Next internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
