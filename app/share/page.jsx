'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getBaby } from '@/lib/storage';

export default function SharePage() {
  const [baby, setBaby] = useState(null);

  useEffect(() => {
    setBaby(getBaby());
  }, []);

  return (
    <>
      <Header baby={baby} back title="Add to the chat" />

      <main className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 pt-3 pb-6">
        <p className="text-[12px] text-wtf-text-3 mb-4">
          Co-parent, grandma, the friend who's done this before.
        </p>

        <div className="bg-white border border-wtf-border rounded-wtf-lg p-3 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-wtf-text-3 font-medium mb-2">In the chat</div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-wtf-berry-soft text-wtf-berry-dark text-[12px] font-medium flex items-center justify-center">
              {baby?.name?.[0]?.toUpperCase() || 'Y'}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-wtf-text">You</div>
              <div className="text-[11px] text-wtf-text-3">solo for now</div>
            </div>
          </div>
        </div>

        <div className="bg-wtf-honey-soft border border-wtf-honey/40 rounded-wtf-lg p-3.5 mb-4">
          <div className="text-[12px] font-medium text-[#854F0B] mb-1">Sharing is in the next version.</div>
          <div className="text-[11px] text-[#854F0B]/85 leading-relaxed">
            Real shared chat across devices needs a backend (Supabase, Vercel Postgres, etc). The UI is here so you can see how it'll feel — wiring it up is the next deploy.
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-wtf-text-3 font-medium mb-2">Coming soon</div>
        <div className="flex flex-col gap-2 opacity-60 pointer-events-none">
          <Stub icon="link" title="Copy invite link" sub="wtf.app/join/..." />
          <Stub icon="whatsapp" title="Send via WhatsApp" />
          <Stub icon="qr" title="Show QR code" />
        </div>

        <div className="mt-auto pt-6 text-[10px] text-wtf-muted leading-relaxed">
          Once shared, anyone you add will see the full chat history, ask their own questions, and save cards. You'll be able to remove them anytime.
        </div>
      </main>
    </>
  );
}

function Stub({ icon, title, sub }) {
  return (
    <div className="bg-white border border-wtf-border rounded-wtf-lg p-2.5 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-md bg-wtf-bg border border-wtf-border flex items-center justify-center text-wtf-text-3">
        {icon === 'link' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1 1M14 10a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1-1" /></svg>
        )}
        {icon === 'whatsapp' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm5.4 14.4c-.2.6-1.4 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.8-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4-.1.7.5.2.6.8 2 .8 2.2.1.1.1.3 0 .5-.1.2-.1.3-.3.5-.1.2-.3.4-.4.5-.1.1-.3.3-.1.5.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.9-1c.2-.3.4-.2.6-.1.3.1 1.6.7 1.9.9.3.1.5.2.5.3.1.1.1.6-.1 1.3z"/></svg>
        )}
        {icon === 'qr' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-wtf-text">{title}</div>
        {sub && <div className="text-[10px] text-wtf-muted truncate">{sub}</div>}
      </div>
    </div>
  );
}
