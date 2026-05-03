# What The Fuss?!

A parenting chat for first-time parents. Claude on the backend, your baby's actual context loaded into every answer, image input for the gross stuff, and a hands-free 3am voice mode.

Built with Next.js 14 (App Router) + Tailwind. Deploys to Vercel.

## Stack at a glance

- **Frontend:** Next.js App Router (React, JS), Tailwind for styling
- **AI:** Anthropic Claude (default `claude-sonnet-4-6`), called from a server-side route
- **Voice:** Web Speech API (browser-native — free, works on Chrome/Edge/Safari mobile)
- **Image:** Claude vision via base64 content blocks
- **Storage:** `localStorage` (single-device for v1; backend comes in v2)

## Get it running locally

```bash
cd what-the-fuss
npm install
cp .env.example .env.local
# open .env.local and paste your Anthropic API key
npm run dev
```

Then open http://localhost:3000.

You'll need an Anthropic API key — get one at https://console.anthropic.com/settings/keys.

## Deploy to Vercel

1. Initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/what-the-fuss.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import the repo.
3. Before the first deploy, add the env var:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
   - (Optional) `ANTHROPIC_MODEL` if you want a different model
4. Deploy.

That's it. Subsequent pushes to `main` auto-deploy.

## Project structure

```
what-the-fuss/
├── app/
│   ├── layout.jsx           # Root layout, fonts, metadata
│   ├── page.jsx             # Home: welcome state, topic chips, composer
│   ├── globals.css          # Tailwind + small custom styles
│   ├── api/
│   │   └── chat/route.js    # Server route → Claude
│   ├── chat/page.jsx        # Active conversation view
│   ├── voice/page.jsx       # 3am hands-free voice mode
│   ├── setup/page.jsx       # Baby profile setup (3 steps)
│   ├── saved/page.jsx       # Saved cards library
│   └── share/page.jsx       # Add someone (stub for v1)
├── components/
│   ├── BrandMark.jsx        # The ?! mark + wordmark
│   ├── Header.jsx           # App header w/ baby chip
│   ├── Composer.jsx         # Text + mic + camera input bar
│   ├── MessageBubble.jsx    # User + assistant message rendering
│   ├── TopicChip.jsx        # Sleep/feeding/poop/etc shortcuts
│   └── Sidebar.jsx          # Drawer with recent + nav
├── lib/
│   ├── storage.js           # localStorage wrappers + helpers
│   └── topics.js            # Topic shortcut definitions
├── public/
│   └── manifest.webmanifest
├── tailwind.config.js       # Berry Bowl design tokens
├── next.config.mjs
├── .env.example
└── package.json
```

## Design system: Berry Bowl

- Cream background `#FAF5EE`
- Deep berry primary `#7A3A5A` (CTAs, mic button, brand mark)
- Honey accent `#E8A030` (warmth, highlights)
- Deep plum-black text `#2A1A2A`
- Soft fills: `#F2E0E8` (berry), `#FBEBD2` (honey), `#E8F0E0` (sage)

Tokens live in `tailwind.config.js` under the `wtf` color namespace (e.g., `bg-wtf-berry`, `text-wtf-text-3`).

## Safety

The system prompt in `app/api/chat/route.js` instructs Claude to:

- Always escalate red-flag symptoms in babies under 3 months (rectal temp ≥38°C, lethargy, feeding refusal, blue lips, labored breathing, bulging fontanelle, blood in stool, projectile vomiting, seizure, unresponsive)
- Recommend medical care for older babies with persistent fever, dehydration, severe rashes, or parental "this seems wrong" gut
- Never diagnose
- Never give exact medication doses

Edit `SYSTEM_PROMPT` in that file to tune behavior.

## Known v1 limitations (intentionally)

- **Single device.** Conversations and saved cards live in localStorage. If you want shared chats with Gabby, that needs a backend (Supabase Free tier is the right pick — see "Roadmap" below).
- **Share screen is a stub.** UI is there; functionality requires the backend.
- **Voice needs Web Speech API.** Works on Chrome, Edge, Safari (incl. iOS). Firefox has it behind a flag.
- **No auth.** Whoever opens the URL on your device sees your chats. Fine for personal use; not fine for public deploy.

## Roadmap (when you're ready)

1. **Supabase backend** for real shared state. Tables: `babies`, `conversations`, `messages`, `saved_cards`, `members`. Use Supabase Auth for the magic-link login. Replace `lib/storage.js` with a Supabase client wrapper — pages don't need to change much.
2. **Streaming responses** from Claude. Switch the `/api/chat` route to return a `ReadableStream` and stream tokens to the chat page.
3. **PWA install** — add icons to `/public`, register a service worker, prompt to install on iOS/Android.
4. **Better TTS.** Web Speech voice quality is rough. Swap in OpenAI TTS or ElevenLabs server-side for the voice mode replies.
5. **Doctor moment cards.** Detect when a conversation crosses a pediatric red line and surface a structured action card with "call now / what to watch for / send summary".

## Editing the personality

The personality lives in two places:

- `app/api/chat/route.js` — Claude's system prompt (tone, voice, safety rules)
- `lib/topics.js` — The topic chips and their seed prompts shown on the home screen

Make them yours.
