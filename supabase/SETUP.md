# V2 Stage 1 — Supabase setup walkthrough

Follow this once. Should take 10–15 minutes. When you're done, ping back and I'll do all the code changes.

---

## 1. Create your Supabase project (3 min)

1. Go to **https://supabase.com** → "Start your project" → sign in with GitHub (easiest).
2. Click **New project**.
3. Fields:
   - **Name:** `what-the-fuss`
   - **Database password:** click *Generate*, then save it somewhere — you'll likely never need it again, but save it just in case.
   - **Region:** **Frankfurt (Central EU)** for Israel — lowest latency.
   - **Pricing plan:** Free.
4. Click **Create new project**. Wait ~2 minutes for it to provision.

---

## 2. Run the database schema (1 min)

1. In the Supabase dashboard left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from your project (it's right next to this guide), copy the entire contents, paste into the SQL editor.
4. Click **Run** (bottom right, or Cmd+Enter).
5. You should see "Success. No rows returned" and 11+ statements executed.

If you re-run later (after editing), it's safe — every statement uses `if not exists` or `drop ... if exists`.

---

## 3. Create the image storage bucket (30 sec)

1. Left sidebar → **Storage**.
2. Click **New bucket**.
3. Name it exactly: `wtf-images`
4. Toggle **Public bucket** ON. (Images need to be loadable from `<img src>` in the browser. URLs contain UUIDs so they're unguessable.)
5. Click **Create bucket**.

That's it for the UI — the upload/read/delete RLS policies for this bucket are already defined in `schema.sql`, so they were created when you ran step 2.

---

## 4. Configure auth (2 min)

1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://what-the-fuss.vercel.app` (your Vercel URL).
3. **Redirect URLs:** add these two, one per line:
   ```
   https://what-the-fuss.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**.

(Optional — customize the magic link email):
1. Authentication → **Email Templates** → **Magic Link**.
2. Edit the subject and body to match the brand. Suggested subject:
   > Your sign-in link for What The Fuss?!
3. Save.

---

## 5. Grab your API keys (2 min)

1. Left sidebar → **Project Settings** (gear icon at bottom) → **API**.
2. Copy these three values somewhere safe — you'll paste them into Vercel next:
   - **Project URL** (e.g., `https://abcdefg.supabase.co`)
   - **anon / public key** — long JWT string starting with `eyJ...`
   - **service_role / secret key** — also a long JWT, marked as secret

⚠️ The service_role key bypasses Row-Level Security. Treat it like a password. **Never commit it to git, never expose it to the browser.**

---

## 6. Add env vars to Vercel (3 min)

1. Vercel dashboard → your `what-the-fuss` project → **Settings** → **Environment Variables**.
2. Add three variables (one at a time, all environments selected):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 5 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key from step 5 |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from step 5 |

3. Save each.
4. **Don't redeploy yet** — there's no code that uses these vars. Wait for me to push the V2 code, then redeploy will happen automatically.

---

## 7. Local dev (optional but nice)

If you want `npm run dev` to also work with the new auth, add the same vars to your local `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## When you're done

Ping me with:

> **"Supabase is set up"**

and I'll write all the code: the auth pages, the Supabase data layer to replace localStorage, image uploads, route protection, and the magic link sign-in flow. After I push, you redeploy on Vercel — sign in with your email, magic link arrives, you're in. Cross-device sync works immediately (sign in on phone + laptop, see the same data).

If anything blocks you in the steps above, tell me which step and what error/screen you're seeing.
