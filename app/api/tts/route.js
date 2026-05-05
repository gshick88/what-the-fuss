// Server-side OpenAI TTS proxy. Keeps the API key off the client.
// POST { text: string, voice?: string }
// Returns binary audio/mpeg.
//
// Cost: tts-1 is $0.015 per 1k chars. A typical Claude reply (~400 chars) costs
// ~$0.006. Personal use will be pennies per month.

const MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1';
const DEFAULT_VOICE = process.env.OPENAI_TTS_VOICE || 'nova';
// Available voices: alloy, echo, fable, onyx, nova, shimmer
// nova = warm female, slightly mature. shimmer = brighter female.

export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Missing OPENAI_API_KEY. Set it in .env.local (dev) or Vercel env vars.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const { text, voice = DEFAULT_VOICE } = body;
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'Missing text' }, { status: 400 });
  }

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice,
        input: text,
        response_format: 'mp3',
        speed: 0.95, // slightly slower — calmer, more grandmother-like
      }),
    });
  } catch (e) {
    return Response.json({ error: 'Network error reaching OpenAI.' }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    return Response.json({ error: `OpenAI TTS error: ${res.status} — ${errText}` }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
