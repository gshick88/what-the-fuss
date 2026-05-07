'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TopicChip from '@/components/TopicChip';
import Composer from '@/components/Composer';
import Sidebar from '@/components/Sidebar';
import { TOPICS } from '@/lib/topics';
import { getBaby, createConversation } from '@/lib/db';

export default function HomePage() {
  const router = useRouter();
  const [baby, setBaby] = useState(null);
  const [text, setText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const b = await getBaby();
      setBaby(b);
    })();
  }, []);

  async function startConversation({ text, image, topic }) {
    if (busy) return;
    setBusy(true);
    try {
      const conv = await createConversation({
        title: text ? text.slice(0, 60) : (topic?.label || 'New question'),
        messages: [
          {
            role: 'user',
            content: text || (topic?.seed ?? ''),
            image: image || null,
          },
        ],
      });
      router.push(`/chat?id=${conv.id}`);
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  }

  return (
    <>
      <Header
        baby={baby}
        right={
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-wtf-text-2 hover:text-wtf-text" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        }
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col w-full mx-auto px-4 pt-6 pb-4 max-w-md md:max-w-lg">
        <div className="mb-5">
          <h1 className="font-display text-[44px] md:text-[52px] font-medium text-wtf-text leading-[1.05]">
            What's the <em className="italic">fuss</em>?
          </h1>
          <p className="text-[25px] text-wtf-text-3 mt-3 leading-relaxed">
            Ask anything. No question is too small or too gross. We've heard worse.
          </p>
        </div>

        {!baby && (
          <button
            onClick={() => router.push('/setup')}
            className="mb-4 text-left bg-wtf-berry-soft border border-wtf-berry/20 rounded-wtf-lg p-3.5 active:scale-[0.99] hover:bg-wtf-berry-soft/80 transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-wtf-berry flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[30px] font-medium text-wtf-berry-dark">Set up the baby profile.</div>
              <div className="text-[25px] text-wtf-berry-dark/75 mt-0.5">30 seconds. Makes every answer 10× better.</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-wtf-berry-dark/60 shrink-0">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 mb-6">
          {TOPICS.map((t) => (
            <TopicChip key={t.key} topic={t} onClick={() => startConversation({ topic: t })} />
          ))}
        </div>

        <div className="mt-auto pt-6">
          <Composer
            value={text}
            onChange={setText}
            onSend={(payload) => startConversation(payload)}
            disabled={busy}
            placeholder={baby?.name ? `Ask about ${baby.name}...` : 'Ask anything...'}
          />
          <div className="text-[16px] text-wtf-muted text-center mt-2.5 leading-relaxed">
            Tap mic for hands-free · attach a photo for rashes, poop, anything visual
          </div>
        </div>
      </main>
    </>
  );
}
