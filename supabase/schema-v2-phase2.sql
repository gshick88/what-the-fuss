-- ============================================================================
-- What The Fuss?! — V2 Phase 2 Schema additions
--
-- Run this AFTER schema.sql is already applied. Adds:
--   1. profiles table (mirrors auth.users for email/display name lookups)
--   2. invitations table (token-based household invites)
--   3. accept_invitation() RPC for the /auth/accept flow
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------- 1. PROFILES -----------------------------------------------------
-- Mirrors auth.users so we can show member names/emails in the UI without
-- granting clients access to the auth schema. Auto-populated via trigger.

create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  display_name  text,
  updated_at    timestamptz default now()
);

create index if not exists profiles_id_idx on profiles (id);

alter table profiles enable row level security;

drop policy if exists "profiles: read household members" on profiles;
drop policy if exists "profiles: update self"            on profiles;

-- A user can read profiles of anyone in any household they belong to.
-- Uses auth_user_households() helper from schema.sql to dodge RLS recursion.
create policy "profiles: read household members" on profiles
  for select using (
    id = auth.uid()
    or id in (
      select user_id from household_members
      where household_id in (select auth_user_households())
    )
  );

-- A user can update their own profile (display_name, etc).
create policy "profiles: update self" on profiles
  for update using (id = auth.uid());

-- Trigger: when a new auth user is created, mirror their email into profiles.
create or replace function handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile on auth.users;
create trigger on_auth_user_profile
  after insert on auth.users
  for each row execute function handle_new_profile();

-- Backfill profiles for any users that already exist (e.g., you, from Phase 1).
insert into profiles (id, email)
  select id, email from auth.users
  on conflict (id) do nothing;

-- ---------- 2. INVITATIONS --------------------------------------------------

create table if not exists invitations (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references households on delete cascade not null,
  token         text unique not null default encode(gen_random_bytes(16), 'hex'),
  invited_by    uuid references auth.users,
  invited_at    timestamptz default now(),
  expires_at    timestamptz default (now() + interval '14 days'),
  used_at       timestamptz,
  used_by       uuid references auth.users
);

create index if not exists invitations_household_idx on invitations (household_id, invited_at desc);
create index if not exists invitations_token_idx on invitations (token);

alter table invitations enable row level security;

drop policy if exists "invites: members can read"   on invitations;
drop policy if exists "invites: members can create" on invitations;
drop policy if exists "invites: members can delete" on invitations;

-- Members of a household can see all its invitations (active + used + expired).
create policy "invites: members can read" on invitations
  for select using (household_id in (select auth_user_households()));

-- Members can create new invites for their household.
create policy "invites: members can create" on invitations
  for insert with check (
    household_id in (select auth_user_households()) and invited_by = auth.uid()
  );

-- Members can revoke (delete) invites for their household.
create policy "invites: members can delete" on invitations
  for delete using (household_id in (select auth_user_households()));

-- ---------- 3. ACCEPT_INVITATION RPC ---------------------------------------
-- Server-side function called by the /auth/accept page. SECURITY DEFINER so
-- it can read the invitation row and write to household_members regardless of
-- the caller's RLS context. Returns the household_id on success, raises on
-- failure with a clear message.

create or replace function accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row invitations%rowtype;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into invite_row from invitations where token = invite_token;
  if not found then
    raise exception 'Invalid invite';
  end if;

  if invite_row.used_at is not null then
    raise exception 'Invite already used';
  end if;

  if invite_row.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  -- If user is already a member of this household, no-op (idempotent re-click).
  if exists (
    select 1 from household_members
    where household_id = invite_row.household_id and user_id = uid
  ) then
    return invite_row.household_id;
  end if;

  -- Add the user as a regular member.
  insert into household_members (household_id, user_id, role)
    values (invite_row.household_id, uid, 'member');

  -- Mark the invite used.
  update invitations
    set used_at = now(), used_by = uid
    where id = invite_row.id;

  return invite_row.household_id;
end;
$$;

-- Anonymous users can't call it directly — auth.uid() check inside fails.
-- Authenticated users can. Grant to authenticated role explicitly.
grant execute on function accept_invitation(text) to authenticated;

-- ---------- 4. BACKFILL: every auth user gets a household ------------------
-- The signup trigger creates a household for every NEW user, but if any user
-- existed before the trigger (or the trigger failed silently for any reason),
-- they'd have no household_members row and every DB call would 'No household'.
-- This idempotently creates one for anyone missing.

do $$
declare
  u record;
  new_household_id uuid;
begin
  for u in
    select id, email from auth.users
    where id not in (select user_id from household_members)
  loop
    insert into households (name, created_by)
      values ('My household', u.id)
      returning id into new_household_id;
    insert into household_members (household_id, user_id, role)
      values (new_household_id, u.id, 'owner');
  end loop;
end$$;

-- Also ensure every existing auth user has a profile row.
insert into profiles (id, email)
  select id, email from auth.users
  on conflict (id) do nothing;

-- ---------- 5. ENABLE REALTIME ON THE RIGHT TABLES -------------------------
-- Supabase Realtime broadcasts row changes via Postgres logical replication
-- through a publication called `supabase_realtime`. Tables aren't included
-- by default; we add them explicitly. RLS still applies to realtime payloads,
-- so household members only receive events for their own data.
--
-- Idempotent: skips tables already in the publication.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table conversations;
  end if;
end$$;

-- ---------- DONE ------------------------------------------------------------
