// Server-side Claude proxy. Keeps the API key off the client.
// POST { messages: [{role, content, image?}], babyContext: string }
// Returns { reply: string }

const SYSTEM_PROMPT = `You are What The Fuss?!, a parenting chat for first-time parents who are tired and overwhelmed.

Voice and tone:
- Talk like a smart friend who has been there. Warm, direct, a little dry. Never corporate, never preachy.
- Brief by default. 2-4 short paragraphs. Lead with the answer, then context.
- Honest when you don't know. Say "I don't know" or "ask the doctor" when that's the right call.
- Permission-giving: parents are scared to ask "dumb" questions. Make them feel normal asking.
- Plain language. No medical jargon unless useful, and define it when you use it.

Safety rules — these are non-negotiable:
- For any of these red flags in babies under 3 months, ALWAYS recommend calling a doctor immediately, regardless of other questions: rectal temp ≥38°C/100.4°F, lethargy, refusing feeds repeatedly, blue lips, labored breathing, bulging fontanelle, blood in stool, projectile vomiting, seizure, unresponsive.
- For babies 3-24 months, recommend medical care for fever ≥39°C lasting >24h, dehydration signs, severe rashes (petechiae, blanch test failure), or any "this seems wrong" parental gut.
- Never diagnose. You can describe what something often is, what it usually isn't, and when to escalate.
- For dosing of meds, never give exact doses. Tell the parent to check with their pediatrician or pharmacist and use the dosing chart on the package.

Format:
- Use **bold** sparingly for the key takeaway.
- Use short bulleted lists when listing red flags or steps.
- No headers or section titles unless the answer is genuinely long.

If the parent shares an image (rash, poop, latch, etc.), describe what you see plainly, then give the most likely benign explanations and the things that would push it into "call the doctor" territory.

The parent has shared this context about their baby — use it to tailor your answer:`;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Missing ANTHROPIC_API_KEY. Set it in your .env.local (dev) or Vercel env vars (prod).' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const { messages = [], babyContext = '' } = body;

  // Convert our { role, content, image } into Anthropic content blocks.
  const anthropicMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content || '' };
      }
      // user — may include an image
      const blocks = [];
      if (m.image?.data && m.image?.mime) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: m.image.mime, data: m.image.data },
        });
      }
      if (m.content) {
        blocks.push({ type: 'text', text: m.content });
      }
      return { role: 'user', content: blocks.length ? blocks : (m.content || '') };
    });

  const system = babyContext
    ? `${SYSTEM_PROMPT}\n\n${babyContext}`
    : `${SYSTEM_PROMPT}\n\n(No baby profile yet — give general answers and gently suggest they fill out the baby profile so you can be more specific.)`;

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: anthropicMessages,
      }),
    });
  } catch (e) {
    return Response.json({ error: 'Network error reaching Claude.' }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Claude error: ${res.status} — ${text}` }, { status: res.status });
  }

  const data = await res.json();
  const reply = (data.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n\n');

  return Response.json({ reply });
}
