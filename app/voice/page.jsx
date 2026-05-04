'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBaby, babyContextString, newConversation, upsertConversation } from '@/lib/storage';

// Pick the warmest available female English voice on the user's device.
// Quality varies wildly — iOS/macOS have premium "Samantha", "Karen", "Moira"
// (the most grandmother-y), Chrome desktop has Google neural voices, etc.
function pickWarmVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const en = voices.filter((v) => /^en/i.test(v.lang));

  // Priority order — warmest, most mature female voices first.
  const preferred = [
    'Moira',                          // iOS/macOS Irish English — gentle, warm
    'Samantha',                       // iOS/macOS — warm, mature
    'Tessa',                          // iOS South African — warm
    'Karen',                          // iOS Australian — warm
    'Allison',                        // iOS premium
    'Ava',                            // iOS premium
    'Susan',                          // iOS
    'Joanna',                         // macOS
    'Microsoft Hazel',                // Windows UK — warm
    'Microsoft Zira',                 // Windows US
    'Google UK English Female',
    'Google US English',
  ];

  for (const name of preferred) {
    const v = en.find((v) => v.name.includes(name) || v.voiceURI?.includes(name));
    if (v) return v;
  }

  // Fallback: any voice whose name implies female
  const femalish = en.find((v) => /female|woman/i.test(v.name));
  if (femalish) return femalish;

  return en[0] || voices[0];
}

// State machine: 'idle' → 'listening' → 'thinking' → 'speaking' → back to 'listening'
export default function VoicePage() {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);

  const recogRef = useRef(null);
  const messagesRef = useRef([]);
  const babyRef = useRef(null);
  const convRef = useRef(null);
  const voiceRef = useRef(null);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState('00:00');

  const stateRef = useRef('idle');
  const pausedRef = useRef(false);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Pre-load voices (Web Speech loads them async — voiceschanged fires when ready)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => { voiceRef.current = pickWarmVoice(); };
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    babyRef.current = getBaby();
    const c = newConversation({ title: 'Voice mode' });
    upsertConversation(c);
    convRef.current = c;

    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setError("Voice mode needs Chrome, Edge, or Safari. Your browser doesn't support it.");
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
      setState('listening');
      if (!pausedRef.current) try { recogRef.current?.start(); } catch {}
      return;
    }
    setState('speaking');
    window.speechSynthesis.cancel();

    const clean = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    const u = new SpeechSynthesisUtterance(clean);

    // Apply our pre-selected warm voice if available
    if (voiceRef.current) u.voice = voiceRef.current;

    u.rate = 0.92;   // slightly slower — more grandmother, less news anchor
    u.pitch = 1.05;  // a touch warmer
    u.volume = 1;

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

  // Orb gradient shifts color with state, but always uses palette tokens.
  const orbStyle = {
    background:
      state === 'thinking'
        ? 'radial-gradient(circle, var(--wtf-honey) 0%, #B07020 70%, transparent 100%)'
        : state === 'speaking'
        ? 'radial-gradient(circle, var(--wtf-sage) 0%, #5A7A48 70%, transparent 100%)'
        : 'radial-gradient(circle, var(--wtf-berry) 0%, var(--wtf-berry-dark) 70%, transparent 100%)',
  };

  return (
    <div className="fixed inset-0 bg-wtf-bg text-wtf-text flex flex-col">
      <div className="flex justify-between items-center px-5 pt-6 text-[10px] uppercase tracking-[0.08em] text-wtf-text-3 font-medium">
        <span className="font-display normal-case tracking-normal text-[14px] text-wtf-text">Voice</span>
        <span>{elapsed}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 -mt-4">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-wtf-berry/15" />
          <div className="absolute inset-3 rounded-full border border-wtf-berry/25" />
          <div
            className={`absolute inset-7 rounded-full ${state === 'listening' ? 'breathe-ring' : ''}`}
            style={orbStyle}
          />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </div>

        <div className="text-center min-h-[80px] max-w-md">
          {transcript && state !== 'speaking' && (
            <div className="font-display text-[18px] text-wtf-text leading-relaxed italic">"{transcript}"</div>
          )}
          {state === 'speaking' && reply && (
            <div className="text-[14px] text-wtf-text-2 leading-relaxed line-clamp-4">{reply}</div>
          )}
          <div className="text-[11px] text-wtf-text-3 mt-3 uppercase tracking-wider">{stateLabel}</div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-3 text-center text-[12px] text-wtf-danger bg-wtf-danger-soft rounded-wtf p-3">
          {error}
        </div>
      )}

      <div className="px-5 pb-7 flex justify-center gap-3">
        <button
          onClick={togglePause}
          className="w-12 h-12 rounded-full bg-wtf-card border border-wtf-border flex items-center justify-center text-wtf-text-2 active:scale-95 transition-transform"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>
        <button
          onClick={() => router.push('/chat')}
          className="w-12 h-12 rounded-full bg-wtf-card border border-wtf-border flex items-center justify-center text-wtf-text-2 active:scale-95 transition-transform"
          aria-label="Switch to text"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          onClick={endSession}
          className="w-12 h-12 rounded-full bg-wtf-berry flex items-center justify-center active:scale-95 transition-transform"
          aria-label="End"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-wtf-muted text-center pb-4 -mt-3">Pause · type · end</div>
    </div>
  );
}
