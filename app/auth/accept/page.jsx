'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { acceptInvitation } from '@/lib/db';

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('working'); // working | done | error
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('error');
        setErrorMsg('Missing invite token.');
        return;
      }

      // If not signed in, kick them through magic link flow first.
      // The login page reads `next` and the callback redirects back here
      // after the user clicks the email link.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const next = encodeURIComponent(`/auth/accept?token=${token}`);
        router.replace(`/auth/login?next=${next}`);
        return;
      }

      try {
        await acceptInvitation(token);
        setStatus('done');
        // Brief "you're in" pause, then home.
        setTimeout(() => router.replace('/'), 1200);
      } catch (e) {
        setStatus('error');
        setErrorMsg(e?.message || 'Could not accept the invite.');
      }
    })();
  }, [token, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full text-center">
      <div className="w-14 h-14 bg-wtf-berry rounded-wtf-lg flex items-center justify-center text-white text-[26px] font-medium mb-6">?!</div>

      {status === 'working' && (
        <>
          <h1 className="font-display text-[40px] font-medium text-wtf-text leading-tight">Joining…</h1>
          <p className="text-[20px] text-wtf-text-3 mt-3 max-w-[340px] leading-relaxed">
            One sec while we add you to the chat.
          </p>
        </>
      )}

      {status === 'done' && (
        <>
          <h1 className="font-display text-[40px] font-medium text-wtf-text leading-tight">You're <em className="italic">in</em>.</h1>
          <p className="text-[20px] text-wtf-text-3 mt-3 max-w-[340px] leading-relaxed">
            Taking you home…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="font-display text-[40px] font-medium text-wtf-text leading-tight">Hmm.</h1>
          <p className="text-[20px] text-wtf-text-3 mt-3 max-w-[360px] leading-relaxed">
            {errorMsg}
          </p>
          <button
            onClick={() => router.replace('/')}
            className="mt-8 bg-wtf-berry text-white rounded-wtf py-3.5 px-8 text-[18px] font-medium"
          >
            Go to home
          </button>
        </>
      )}
    </main>
  );
}

export default function AcceptPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInner />
    </Suspense>
  );
}
