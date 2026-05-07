'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
      <div className="w-14 h-14 bg-wtf-berry rounded-wtf-lg flex items-center justify-center text-white text-[26px] font-medium mb-6">?!</div>

      {sent ? (
        <div className="text-center">
          <h1 className="font-display text-[40px] font-medium text-wtf-text leading-tight">Check your <em className="italic">email</em>.</h1>
          <p className="text-[20px] text-wtf-text-3 mt-4 max-w-[340px] leading-relaxed">
            We sent a sign-in link to <span className="font-medium text-wtf-text">{email}</span>. Tap it on this device.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-8 text-[17px] text-wtf-text-3 underline underline-offset-4"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <h1 className="font-display text-[44px] font-medium text-wtf-text leading-tight text-center">Sign <em className="italic">in</em>.</h1>
          <p className="text-[20px] text-wtf-text-3 text-center mt-3 max-w-[340px] leading-relaxed">
            Type your email. We'll send you a magic link. No password.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 w-full flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-white border border-wtf-border rounded-wtf-sm px-4 py-3 text-[22px] text-wtf-text outline-none focus:border-wtf-berry"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-wtf-berry text-white rounded-wtf py-4 text-[24px] font-medium active:scale-[0.98] disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Sending...' : 'Send me a link'}
            </button>
          </form>

          {error && (
            <div className="mt-4 text-[16px] text-wtf-danger bg-wtf-danger-soft rounded-wtf p-3 w-full text-center">
              {error}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
