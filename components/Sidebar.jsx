'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getConversations, getCurrentUser } from '@/lib/db';
import { useTheme } from '@/lib/theme';

export default function Sidebar({ open, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const [convs, setConvs] = useState([]);
  const [email, setEmail] = useState('');
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, u] = await Promise.all([getConversations(), getCurrentUser()]);
      if (cancelled) return;
      setConvs(c);
      setEmail(u?.email || '');
    })();
    return () => { cancelled = true; };
  }, [open, pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-wtf-text/30" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative bg-wtf-bg w-72 max-w-[85vw] h-full p-4 flex flex-col gap-4 shadow-xl"
      >
        <button
          onClick={() => { router.push('/'); onClose(); }}
          className="bg-wtf-berry text-white rounded-wtf py-4 text-[24px] font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <span className="text-2xl leading-none">+</span> New question
        </button>

        <div>
          <div className="text-[18px] uppercase tracking-wider text-wtf-muted font-medium mb-2 px-1">Recent</div>
          <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[40vh] no-scrollbar">
            {convs.length === 0 && (
              <div className="text-[20px] text-wtf-muted px-2 py-3">No questions yet. Ask one.</div>
            )}
            {convs.map((c) => (
              <Link
                key={c.id}
                href={`/chat?id=${c.id}`}
                onClick={onClose}
                className="text-[22px] text-wtf-text-2 px-2 py-2.5 rounded-md hover:bg-white/60 truncate"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-1">
          <Link href="/saved" onClick={onClose} className="text-[22px] text-wtf-text px-2 py-2.5 rounded-md hover:bg-wtf-card/60">Saved cards</Link>
          <Link href="/share" onClick={onClose} className="text-[22px] text-wtf-text px-2 py-2.5 rounded-md hover:bg-wtf-card/60">Add to the chat</Link>
          <Link href="/setup" onClick={onClose} className="text-[22px] text-wtf-text px-2 py-2.5 rounded-md hover:bg-wtf-card/60">Baby profile</Link>

          <button
            onClick={toggleTheme}
            className="mt-2 flex items-center justify-between text-[22px] text-wtf-text px-2 py-2.5 rounded-md hover:bg-wtf-card/60"
          >
            <span>Dark mode</span>
            <span className={`relative w-12 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-wtf-berry' : 'bg-wtf-border'}`}>
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-[26px]' : 'translate-x-1'}`}
              />
            </span>
          </button>

          {/* Account footer */}
          <div className="mt-3 pt-3 border-t border-wtf-border/60 flex flex-col gap-2">
            {email && (
              <div className="text-[14px] text-wtf-muted px-2 truncate" title={email}>
                Signed in as <span className="text-wtf-text-2">{email}</span>
              </div>
            )}
            <a
              href="/auth/logout"
              className="text-[18px] text-wtf-text-3 px-2 py-2 rounded-md hover:bg-wtf-card/60 text-left"
            >
              Sign out
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
