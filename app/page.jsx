'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TopicChip from '@/components/TopicChip';
import Composer from '@/components/Composer';
import Sidebar from '@/components/Sidebar';
import { TOPICS } from '@/lib/topics';
import { getBaby, newConversation, upsertConversation } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [baby, setBaby] = useState(null);
  const [text, setText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setBaby(getBaby());
  }, []);

  function startConversation({ text, image, topic }) {
    const conv = newConversation({
      title: text ? text.slice(0, 60) : (topic?.label || 'New question'),
      messages: [
        {
          role: 'user',
          content: text || (topic?.seed ?? ''),
          image: image || null,
          ts: Date.now(),
        },
      ],
    });
    upsertConversation(conv);
    router.push(`/chat?id=${conv.id}`);
  }

  return (
    <>
      <Header
        baby={baby}
        right={
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-wtf-text-2" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        }
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 pt-6 pb-4">
        {!baby && (
          <button
            onClick={() => router.push('/setup')}
            className="mb-4 text-left bg-wtf-honey-soft border border-wtf-honey/40 rounded-wtf p-3 active:scale-[0.99]"
          >
            <div className="text-[12px] font-medium text-[#854F0B]">First time? Set up the baby profile.</div>
            <div className="text-[11px] text-[#854F0B]/80 mt-0.5">30 seconds. Makes every answer 10× better.</div>
          </button>
        )}

        <div className="mb-5">
          <h1 className="text-[26px] font-medium text-wtf-text tracking-tight leading-tight">What's the fuss?</h1>
          <p className="text-[13px] text-wtf-text-3 mt-1.5 leading-relaxed">
            Ask anything. No question is too small or too gross. We've heard worse.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {TOPICS.map((t) => (
            <TopicChip key={t.key} topic={t} onClick={() => startConversation({ topic: t })} />
          ))}
        </div>

        <div className="mt-auto">
          <Composer
            value={text}
            onChange={setText}
            onSend={(payload) => startConversation(payload)}
            placeholder={baby?.name ? `Ask about ${baby.name}...` : 'Ask anything...'}
          />
          <div className="text-[10px] text-wtf-muted text-center mt-2 leading-relaxed">
            Tap mic for hands-free · attach a photo for rashes, poop, anything visual
          </div>
        </div>
      </main>
    </>
  );
}
