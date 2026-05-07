'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Composer from '@/components/Composer';
import MessageBubble from '@/components/MessageBubble';
import {
  getBaby,
  getConversation,
  appendMessage,
  createConversation,
} from '@/lib/db';
import { babyContextString } from '@/lib/storage';

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');

  const [baby, setBaby] = useState(null);
  const [conv, setConv] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const sentRef = useRef(false);

  // Load conversation + baby
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = await getBaby();
      if (!cancelled) setBaby(b);

      if (id) {
        const c = await getConversation(id);
        if (cancelled) return;
        if (c) setConv(c);
        else router.replace('/');
      } else {
        const c = await createConversation();
        if (cancelled) return;
        setConv(c);
        router.replace(`/chat?id=${c.id}`);
      }
    })();
    return () => { cancelled = true; };
  }, [id, router]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conv?.messages?.length, busy]);

  // Auto-send if conversation has a user message at the tail and no AI reply yet
  useEffect(() => {
    if (!conv || sentRef.current) return;
    const last = conv.messages[conv.messages.length - 1];
    if (conv.messages.length > 0 && last?.role === 'user') {
      sentRef.current = true;
      sendToClaude(conv.messages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id]);

  async function sendToClaude(messages) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(({ role, content, image }) => ({ role, content, image })),
          babyContext: babyContextString(baby),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      const reply = { role: 'assistant', content: data.reply, ts: Date.now(), convId: conv.id };
      await appendMessage(conv.id, reply);
      setConv((prev) => prev ? { ...prev, messages: [...messages, reply] } : prev);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend({ text, image }) {
    if (!conv) return;
    const userMsg = { role: 'user', content: text, image: image || null, ts: Date.now() };
    try {
      await appendMessage(conv.id, userMsg);
    } catch (e) {
      setError(e.message || 'Could not save message.');
      return;
    }
    const next = { ...conv, messages: [...conv.messages, userMsg] };
    setConv(next);
    sendToClaude(next.messages);
  }

  if (!conv) return null;

  return (
    <>
      <Header baby={baby} back title={conv.title || 'Chat'} />

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 no-scrollbar">
          {conv.messages.length === 0 && (
            <div className="text-center text-wtf-text-3 text-[19px] mt-10">
              Ask anything. {baby?.name ? `${baby.name}'s` : 'Your baby\'s'} context is loaded.
            </div>
          )}
          {conv.messages.map((m, i) => (
            <MessageBubble key={i} message={{ ...m, convId: conv.id }} />
          ))}
          {busy && (
            <div className="self-start max-w-[85%]">
              <div className="bg-white border border-wtf-border rounded-wtf-lg rounded-bl-[4px] px-3.5 py-3 flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-wtf-berry/60 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-wtf-berry/60 animate-pulse" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-wtf-berry/60 animate-pulse" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}
          {error && (
            <div className="self-start max-w-[92%] bg-wtf-danger-soft border border-wtf-danger/30 rounded-wtf-lg p-3 text-[17px] text-wtf-danger">
              {error}
            </div>
          )}
        </div>

        <div className="pt-2 pb-4">
          <Composer
            value={text}
            onChange={setText}
            onSend={handleSend}
            disabled={busy}
            placeholder="Reply..."
          />
        </div>
      </main>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
