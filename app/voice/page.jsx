'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBaby, babyContextString, newConversation, upsertConversation } from '@/lib/storage';

// Pick the warmest available female English voice on the user's device.
// iOS premium voices ("Moira", "Samantha", "Karen") are warmest. Chrome desktop
// has Google neural voices which are decent but flatter.
function pickWarmVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const en = voices.filter((v) => /^en/i.test(v.lang));

  const preferred = [
    'Moira', 'Samantha', 'Tessa', 'Karen', 'Allison', 'Ava', 'Susan',
    'Joanna', 'Microsoft Hazel', 'Microsoft Zira',
    'Google UK English Female', 'Google US English',
  ];

  for (const name of preferred) {
    const v = en.find((v) => v.name.includes(name) || (v.voiceURI || '').includes(name));
    if (v) return v;
  }
  const femalish = en.find((v) => /female|woman/i.test(v.name));
  if (femalish) return femalish;
  return en[0] || voices[0];
}

export default function VoicePage() {
  const router = useRouter();

  // Has the user tapped Start? (unlocks iOS audio + begins recognition)
  const [started, setStarted] = useState(false);

  const [state, setState] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);

  const recogRef = useRef(null);
  const messagesRef = useRef([]);
  const babyRef = useRef(null);
  const convRef = useRef(null);
  const voiceRef = useRef(null);
  const watchdogRef = useRef(null);
  const audioRef = useRef(null);              // <audio> element for OpenAI TTS playback
  const ttsAvailableRef = useRef(true);       // flips false if /api/tts fails (no key)
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState('00:00');

  const stateRef = useRef('idle');
  const pausedRef = useRef(false);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Pre-load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => { voiceRef.current = pickWarmVoice(); };
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  // Timer
  useEffect(() => {
    if (!started) return;
    startedAt.current = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 500);
    return () => clearInterval(t);
  }, [started]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { recogRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  // Initialize the session — must be called from inside the Start button click
  // so iOS Safari treats it as a user-gesture and audio synthesis unlocks.
  function handleStart() {
    setError(null);

    // (1a) Unlock Web Speech TTS by speaking a silent utterance from the gesture.
    // Without this, iOS Safari silently refuses every later speak() call.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const unlock = new SpeechSynthesisUtterance(' ');
        unlock.volume = 0;
        unlock.rate = 1;
        window.speechSynthesis.speak(unlock);
      } catch {}
    }

    // (1b) Unlock <audio> playback so OpenAI TTS responses can autoplay later.
    // Same iOS gesture rule — first .play() must come from a tap.
    if (audioRef.current) {
      try {
        audioRef.current.muted = true;
        const p = audioRef.current.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            try { audioRef.current.pause(); audioRef.current.muted = false; } catch {}
          }).catch(() => {});
        }
      } catch {}
    }

    // (2) Initialize conversation + baby context
    babyRef.current = getBaby();
    const c = newConversation({ title: 'Voice mode' });
    upsertConversation(c);
    convRef.current = c;

    // (3) Set up speech recognition
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
      setError(`Mic: ${e.error}`);
    };
    recog.onend = () => {
      if (finalText.trim()) {
        const said = finalText.trim();
        finalText = '';
        sendUtterance(said);
      } else if (!pausedRef.current && stateRef.current !== 'speaking' && stateRef.current !== 'thinking') {
        try { recog.start(); } catch {}
      }
    };

    recogRef.current = recog;
    setStarted(true);
    setState('listening');
    try { recog.start(); } catch (e) {
      setError('Could not start mic. Check permissions.');
    }
  }

  async function sendUtterance(text) {
    setState('thinking');
    setTranscript(text);
    setReply('');

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
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
      if (!data.reply) throw new Error('Empty reply from Claude.');

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

  // Two-tier TTS: try OpenAI's tts-1 (warm female "nova"), fall back to the
  // browser's built-in Web Speech if the endpoint isn't configured or fails.
  async function speak(text) {
    setState('speaking');

    const clean = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');

    const finishAndListen = () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      setState('listening');
      if (!pausedRef.current) {
        setTranscript('');
        try { recogRef.current?.start(); } catch {}
      }
    };

    // Generic watchdog used by both paths
    const startWatchdog = (ms) => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        try { audioRef.current?.pause(); } catch {}
        try { window.speechSynthesis?.cancel(); } catch {}
        finishAndListen();
      }, ms);
    };

    // ---------- Path A: OpenAI TTS (premium voice) ----------
    if (ttsAvailableRef.current) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: clean }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          const audio = audioRef.current || new Audio();
          audio.src = url;
          audio.muted = false;
          audio.volume = 1;

          // Watchdog: assume ~14 chars/sec at speed=0.95, plus 5s grace
          startWatchdog(Math.min(120000, (clean.length / 14) * 1000 + 5000));

          audio.onended = () => { URL.revokeObjectURL(url); finishAndListen(); };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            // Audio playback failed — fall back to Web Speech
            ttsAvailableRef.current = false; // don't try again this session
            webSpeechSpeak(clean, finishAndListen, startWatchdog);
          };

          await audio.play();
          return;
        } else {
          // Server returned an error — likely no API key. Don't try OpenAI again
          // this session, fall through to Web Speech.
          ttsAvailableRef.current = false;
        }
      } catch (e) {
        // Network or other failure — fall through
        ttsAvailableRef.current = false;
      }
    }

    // ---------- Path B: Web Speech fallback ----------
    webSpeechSpeak(clean, finishAndListen, startWatchdog);
  }

  function webSpeechSpeak(clean, finishAndListen, startWatchdog) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      finishAndListen();
      return;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    if (!voiceRef.current) voiceRef.current = pickWarmVoice();
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 0.92;
    u.pitch = 1.05;
    u.volume = 1;

    u.onend = finishAndListen;
    u.onerror = () => finishAndListen();

    startWatchdog(Math.min(60000, (clean.length / 10) * 1000 + 4000));

    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      finishAndListen();
    }
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
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      setState('idle');
    }
  }

  function endSession() {
    try { recogRef.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
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

  const orbStyle = {
    background:
      state === 'thinking'
        ? 'radial-gradient(circle, var(--wtf-honey) 0%, #B07020 70%, transparent 100%)'
        : state === 'speaking'
        ? 'radial-gradient(circle, var(--wtf-sage) 0%, #5A7A48 70%, transparent 100%)'
        : 'radial-gradient(circle, var(--wtf-berry) 0%, var(--wtf-berry-dark) 70%, transparent 100%)',
  };

  // Hidden audio element used by OpenAI TTS playback. Lives outside the
  // conditional render so we can ref it from handleStart for the gesture unlock.
  const audioEl = <audio ref={audioRef} preload="auto" className="hidden" />;

  // ============== START SCREEN (before user tap) ==============
  if (!started) {
    return (
      <div className="fixed inset-0 bg-wtf-bg text-wtf-text flex flex-col items-center justify-center px-6">
        {audioEl}
        <div className="font-display text-[38px] text-wtf-text leading-tight text-center">
          Talk it <em className="italic">out</em>.
        </div>
        <p className="text-[16px] text-wtf-text-3 text-center mt-3 max-w-[320px] leading-relaxed">
          Hands-free conversation. Tap the orb, ask anything, get a real answer back.
        </p>

        <button
          onClick={handleStart}
          className="mt-10 relative w-44 h-44 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Start voice chat"
        >
          <div className="absolute inset-0 rounded-full border border-wtf-berry/15" />
          <div className="absolute inset-3 rounded-full border border-wtf-berry/25" />
          <div
            className="absolute inset-7 rounded-full breathe-ring"
            style={{ background: 'radial-gradient(circle, var(--wtf-berry) 0%, var(--wtf-berry-dark) 70%, transparent 100%)' }}
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>

        <div className="mt-10 text-[14px] text-wtf-muted text-center max-w-[300px] leading-relaxed">
          We'll need mic access. The first tap unlocks audio.
        </div>

        <button
          onClick={() => router.back()}
          className="absolute top-5 right-5 text-[14px] text-wtf-text-3 px-3 py-1.5"
        >
          Back
        </button>

        {error && (
          <div className="absolute bottom-8 left-5 right-5 text-center text-[14px] text-wtf-danger bg-wtf-danger-soft rounded-wtf p-3">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ============== ACTIVE VOICE SESSION ==============
  return (
    <div className="fixed inset-0 bg-wtf-bg text-wtf-text flex flex-col">
      {audioEl}
      <div className="flex justify-between items-center px-5 pt-6 text-[12px] uppercase tracking-[0.08em] text-wtf-text-3 font-medium">
        <span className="font-display normal-case tracking-normal text-[16px] text-wtf-text">Voice</span>
        <span>{elapsed}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 -mt-2">
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

        <div className="text-[13px] text-wtf-text-3 uppercase tracking-wider">{stateLabel}</div>

        <div className="text-center max-w-md w-full px-2">
          {transcript && state !== 'speaking' && (
            <div className="font-display text-[22px] text-wtf-text leading-relaxed italic">
              "{transcript}"
            </div>
          )}
          {state === 'speaking' && reply && (
            <div className="text-[17px] text-wtf-text leading-relaxed">
              {reply}
            </div>
          )}
          {state === 'listening' && !transcript && (
            <div className="text-[15px] text-wtf-muted">I'm listening. Just talk.</div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-2 text-center text-[14px] text-wtf-danger bg-wtf-danger-soft rounded-wtf p-3">
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
      <div className="text-[12px] text-wtf-muted text-center pb-4 -mt-3">Pause · type · end</div>
    </div>
  );
}
