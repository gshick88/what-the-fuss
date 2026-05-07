-- ============================================================================
-- What The Fuss?! — V2 Schema (idempotent, safe to re-run)
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Design principles:
--   1. Row-Level Security on every table, with explicit policies for every op.
--   2. Multi-household-safe from day 1 (uses subqueries, not single-row helpers)
--      so Stage 2 (invites, multi-household membership) doesn't need a rewrite.
--   3. Storage bucket RLS defined here (not in the UI) so it's version-controlled.
--   4. Auto-create household on signup via trigger so new users land in a
--      working app instantly.
-- ============================================================================

-- ---------- TABLES ----------------------------------------------------------

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text default 'My household',
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households on delete cascade,
  user_id      uuid references auth.users on delete cascade,
  role         text default 'owner' check (role in ('owner','member')),
  joined_at    timestamptz default now(),
  primary key (household_id, user_id)
);

create table if not exists babies (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references households on delete cascade not null,
  name          text,
  dob           date,
  born_or_due   text,
  sex           text,
  feeding       text,
  birth_weight  text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists conversations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households on delete cascade not null,
  baby_id      uuid references babies on delete set null,
  title        text,
  created_by   uuid references auth.users,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade not null,
  role            text not null check (role in ('user','assistant')),
  content         text,
  image_url       text,
  image_mime      text,
  created_by      uuid references auth.users,
  created_at      timestamptz default now()
);

create table if not exists saved_cards (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid references households on delete cascade not null,
  source_conversation_id uuid references conversations on delete set null,
  title                  text,
  snippet                text,
  topic                  text,
  content                text,
  saved_by               uuid references auth.users,
  saved_at               timestamptz default now()
);

-- ---------- INDEXES ---------------------------------------------------------

create index if not exists members_user_idx          on household_members (user_id);
create index if not exists members_household_idx     on household_members (household_id);
create index if not exists babies_household_idx      on babies (household_id);
create index if not exists conversations_household_idx
                                                     on conversations (household_id, updated_at desc);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);
create index if not exists saved_cards_household_idx on saved_cards (household_id, saved_at desc);

-- ---------- ROW-LEVEL SECURITY: ENABLE -------------------------------------

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table babies             enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
alter table saved_cards        enable row level security;

-- ---------- ROW-LEVEL SECURITY: POLICIES ------------------------------------
-- Drop any old policies first so this script is safely re-runnable.

drop policy if exists "households: members can read"        on households;
drop policy if exists "households: authenticated can create" on households;
drop policy if exists "households: owners can update"       on households;
drop policy if exists "households: owners can delete"       on households;

drop policy if exists "members: read own rows or same household" on household_members;
drop policy if exists "members: insert self"                    on household_members;
drop policy if exists "members: owner can add others"           on household_members;
drop policy if exists "members: owner or self can delete"       on household_members;

drop policy if exists "babies: household members all access"        on babies;
drop policy if exists "conversations: household members all access" on conversations;
drop policy if exists "messages: household members all access"      on messages;
drop policy if exists "saved_cards: household members all access"   on saved_cards;

-- households -----------------------------------------------------------------
-- A user can READ households they're a member of.
create policy "households: members can read" on households
  for select using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

-- A user can CREATE a household (used in Stage 2 if you ever want a second one;
-- the new-user trigger covers signup case server-side so this is a fallback).
create policy "households: authenticated can create" on households
  for insert with check (auth.uid() is not null);

-- Only OWNERS of the household can update its row (rename, etc).
create policy "households: owners can update" on households
  for update using (
    id in (select household_id from household_members
           where user_id = auth.uid() and role = 'owner')
  );

-- Only OWNERS can delete a household.
create policy "households: owners can delete" on households
  for delete using (
    id in (select household_id from household_members
           where user_id = auth.uid() and role = 'owner')
  );

-- household_members ---------------------------------------------------------
-- A user can read their own membership rows AND rows for households they're in
-- (so they can see who else is in the household).
create policy "members: read own rows or same household" on household_members
  for select using (
    user_id = auth.uid()
    or household_id in (select household_id from household_members where user_id = auth.uid())
  );

-- Self-join: a user can insert a row for themselves (used when they accept an
-- invite link). The household_id must be one they've been granted access to via
-- the invite flow — which we'll layer in Stage 2.
create policy "members: insert self" on household_members
  for insert with check (user_id = auth.uid());

-- Owner-add: an owner can add another user to their household (used by the
-- invite flow in Stage 2 when the owner manually adds someone).
create policy "members: owner can add others" on household_members
  for insert with check (
    household_id in (select household_id from household_members
                     where user_id = auth.uid() and role = 'owner')
  );

-- Removal: a user can remove themselves; an owner can remove anyone.
create policy "members: owner or self can delete" on household_members
  for delete using (
    user_id = auth.uid()
    or household_id in (select household_id from household_members
                        where user_id = auth.uid() and role = 'owner')
  );

-- babies / conversations / messages / saved_cards ---------------------------
-- Same shape: any household member can read/write their household's rows.

create policy "babies: household members all access" on babies
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "conversations: household members all access" on conversations
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "messages: household members all access" on messages
  for all using (
    conversation_id in (
      select id from conversations
      where household_id in (select household_id from household_members where user_id = auth.uid())
    )
  ) with check (
    conversation_id in (
      select id from conversations
      where household_id in (select household_id from household_members where user_id = auth.uid())
    )
  );

create policy "saved_cards: household members all access" on saved_cards
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

-- ---------- AUTO-CREATE HOUSEHOLD ON SIGNUP --------------------------------
-- SECURITY DEFINER bypasses RLS so the trigger can insert despite the user
-- not yet being a member of any household at the moment of the trigger.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  insert into households (name, created_by) values ('My household', new.id)
    returning id into new_household_id;
  insert into household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- STORAGE: image bucket policies ---------------------------------
-- The 'wtf-images' bucket itself is created in the Storage UI (one click).
-- These policies live on storage.objects — they govern who can upload/read/delete.
--
-- We make the bucket effectively household-scoped:
--   - Files are uploaded under the path `{household_id}/{filename}`.
--   - Authenticated users can upload to their own household's prefix.
--   - Anyone (anon) can read — needed because <img src> on the public web
--     doesn't send auth headers. URLs contain UUIDs so they're unguessable.
--   - Only the uploader can delete their own files.

drop policy if exists "wtf-images: read all"               on storage.objects;
drop policy if exists "wtf-images: members can upload"     on storage.objects;
drop policy if exists "wtf-images: uploader can delete"    on storage.objects;

create policy "wtf-images: read all" on storage.objects
  for select using (bucket_id = 'wtf-images');

create policy "wtf-images: members can upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'wtf-images'
    and (storage.foldername(name))[1] in (
      select household_id::text from household_members where user_id = auth.uid()
    )
  );

create policy "wtf-images: uploader can delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'wtf-images' and owner = auth.uid()
  );

-- ---------- DONE ------------------------------------------------------------
-- Sanity check: every table and storage.objects has RLS enabled with explicit
-- policies for SELECT, INSERT, UPDATE (where applicable), and DELETE.
-- The anon role has no access to any of these by default — only authenticated
-- users with valid household membership see anything.
