'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBaby, babyContextString, newConversation, upsertConversation } from '@/lib/storage';

// State machine: 'idle' → 'listening' → 'thinking' → 'speaking' → back to 'listening'
export default function VoicePage() {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);

  const recogRef = useRef(null);
  const messagesRef = useRef([]); // running conversation
  const babyRef = useRef(null);
  const convRef = useRef(null);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState('00:00');

  // Refs that mirror state so callbacks bound to recognition (set up once on mount)
  // can read the *current* values, not the stale closure values.
  const stateRef = useRef('idle');
  const pausedRef = useRef(false);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Tick a timer
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Init: baby + conversation + start listening
  useEffect(() => {
    babyRef.current = getBaby();
    const c = newConversation({ title: 'Voice mode' });
    upsertConversation(c);
    convRef.current = c;

    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setError('Voice mode needs Chrome, Edge, or Safari. Your browser doesn\'t support it.');
      return;
    }

    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';

    let finalText = '';
    recog.onresult = (e) => {
      let interim = '';
      finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recog.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(`Mic error: ${e.error}`);
    };
    recog.onend = () => {
      // If we got something, send it. Otherwise restart listening (unless paused).
      if (finalText.trim()) {
        sendUtterance(finalText.trim());
        finalText = '';
      } else if (!pausedRef.current && stateRef.current !== 'speaking' && stateRef.current !== 'thinking') {
        try { recog.start(); } catch {}
      }
    };

    recogRef.current = recog;
    setState('listening');
    try { recog.start(); } catch {}

    return () => {
      try { recog.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendUtterance(text) {
    setState('thinking');
    setTranscript(text);

    const userMsg = { role: 'user', content: text, ts: Date.now() };
    messagesRef.current = [...messagesRef.current, userMsg];

    // Persist
    convRef.current = { ...convRef.current, messages: messagesRef.current };
    upsertConversation(convRef.current);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: messagesRef.current.map(({ role, content }) => ({ role, content })),
          babyContext: babyContextString(babyRef.current),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const assistantMsg = { role: 'assistant', content: data.reply, ts: Date.now() };
      messagesRef.current = [...messagesRef.current, assistantMsg];
      convRef.current = { ...convRef.current, messages: messagesRef.current };
      upsertConversation(convRef.current);

      setReply(data.reply);
      speak(data.reply);
    } catch (e) {
      setError(e.message || 'Failed to reach Claude.');
      setState('listening');
      if (!pausedRef.current) try { recogRef.current?.start(); } catch {}
    }
  }

  function speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // No TTS — go back to listening
      setState('listening');
      if (!pausedRef.current) try { recogRef.current?.start(); } catch {}
      return;
    }
    setState('speaking');
    window.speechSynthesis.cancel();

    // Strip markdown for cleaner speech
    const clean = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => {
      setState('listening');
      if (!pausedRef.current) {
        setTranscript('');
        try { recogRef.current?.start(); } catch {}
      }
    };
    u.onerror = () => {
      setState('listening');
      if (!pausedRef.current) try { recogRef.current?.start(); } catch {}
    };
    window.speechSynthesis.speak(u);
  }

  function togglePause() {
    if (paused) {
      setPaused(false);
      setState('listening');
      try { recogRef.current?.start(); } catch {}
    } else {
      setPaused(true);
      try { recogRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      setState('idle');
    }
  }

  function endSession() {
    try { recogRef.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    if (convRef.current?.messages?.length) {
      router.replace(`/chat?id=${convRef.current.id}`);
    } else {
      router.replace('/');
    }
  }

  const stateLabel = {
    idle: 'Paused',
    listening: 'Listening',
    thinking: 'Thinking…',
    speaking: 'Talking',
  }[state];

  return (
    <div className="fixed inset-0 bg-wtf-night text-white flex flex-col">
      <div className="flex justify-between items-center px-5 pt-5 text-[10px] uppercase tracking-[0.08em] text-white/50 font-medium">
        <span>3am mode</span>
        <span>{elapsed}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-7">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-wtf-berry/15" />
          <div className="absolute inset-3 rounded-full border border-wtf-berry/25" />
          <div
            className={`absolute inset-7 rounded-full ${state === 'listening' ? 'breathe-ring' : ''}`}
            style={{
              background:
                state === 'thinking'
                  ? 'radial-gradient(circle, #E8A030 0%, #B07020 70%, transparent 100%)'
                  : state === 'speaking'
                  ? 'radial-gradient(circle, #88A87A 0%, #5A7A48 70%, transparent 100%)'
                  : 'radial-gradient(circle, #7A3A5A 0%, #5A2A45 70%, transparent 100%)',
            }}
          />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </div>

        <div className="text-center min-h-[80px] max-w-md">
          {transcript && state !== 'speaking' && (
            <div className="text-[15px] text-white font-medium leading-relaxed">"{transcript}"</div>
          )}
          {state === 'speaking' && reply && (
            <div className="text-[13px] text-white/80 leading-relaxed line-clamp-4">{reply}</div>
          )}
          <div className="text-[11px] text-white/40 mt-3 uppercase tracking-wider">{stateLabel}</div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-3 text-center text-[12px] text-wtf-danger bg-white/5 rounded-wtf p-3">
          {error}
        </div>
      )}

      <div className="px-5 pb-7 flex justify-center gap-3">
        <button
          onClick={togglePause}
          className="w-12 h-12 rounded-full bg-wtf-night-2 border border-white/10 flex items-center justify-center"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>
        <button
          onClick={() => router.push('/chat')}
          className="w-12 h-12 rounded-full bg-wtf-night-2 border border-white/10 flex items-center justify-center text-white/70"
          aria-label="Switch to text"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          onClick={endSession}
          className="w-12 h-12 rounded-full bg-wtf-berry flex items-center justify-center"
          aria-label="End"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-white/30 text-center pb-4 -mt-3">Pause · type · end</div>
    </div>
  );
}
