-- ============================================================================
-- Fix: RLS recursion on household_members
--
-- WHY: The original SELECT policy on household_members had an OR clause that
-- referenced household_members itself in a subquery. Postgres tries to
-- enforce RLS on the subquery too, which means it re-enters the same policy,
-- which has the same subquery, which... you get it. The result is an
-- infinite-recursion case the planner silently bails on, returning ZERO rows
-- even when the user's own row should match the simpler `user_id = auth.uid()`
-- branch of the OR. Symptom: every getHouseholdId() returns null, every
-- subsequent operation fails with "No household".
--
-- FIX: a SECURITY DEFINER helper function that bypasses RLS for the lookup.
-- All policies that need to know "what households does this user belong to"
-- now call the function instead of subquerying household_members directly.
--
-- Run this whole block once. Idempotent.
-- ============================================================================

-- Helper: returns household IDs the current user is a member of.
-- SECURITY DEFINER → bypasses RLS, no recursion.
create or replace function auth_user_households()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid();
$$;

grant execute on function auth_user_households() to authenticated, anon;

-- ---------- household_members ------------------------------------------------
drop policy if exists "members: read own rows or same household" on household_members;
drop policy if exists "membership select" on household_members;

create policy "members: read household" on household_members
  for select using (
    user_id = auth.uid()
    or household_id in (select auth_user_households())
  );

-- ---------- households -------------------------------------------------------
drop policy if exists "households: members can read" on households;
create policy "households: members can read" on households
  for select using (id in (select auth_user_households()));

-- (update / delete policies still use direct subqueries with the role filter —
--  those don't recurse because they only return rows where role='owner', which
--  is a much narrower path. Leaving them as-is.)

-- ---------- babies -----------------------------------------------------------
drop policy if exists "babies: household members all access" on babies;
create policy "babies: household members all access" on babies
  for all using (household_id in (select auth_user_households()))
  with check (household_id in (select auth_user_households()));

-- ---------- conversations ----------------------------------------------------
drop policy if exists "conversations: household members all access" on conversations;
create policy "conversations: household members all access" on conversations
  for all using (household_id in (select auth_user_households()))
  with check (household_id in (select auth_user_households()));

-- ---------- messages ---------------------------------------------------------
drop policy if exists "messages: household members all access" on messages;
create policy "messages: household members all access" on messages
  for all using (
    conversation_id in (
      select id from conversations
      where household_id in (select auth_user_households())
    )
  ) with check (
    conversation_id in (
      select id from conversations
      where household_id in (select auth_user_households())
    )
  );

-- ---------- saved_cards ------------------------------------------------------
drop policy if exists "saved_cards: household members all access" on saved_cards;
create policy "saved_cards: household members all access" on saved_cards
  for all using (household_id in (select auth_user_households()))
  with check (household_id in (select auth_user_households()));

-- ---------- invitations (Phase 2) -------------------------------------------
drop policy if exists "invites: members can read" on invitations;
create policy "invites: members can read" on invitations
  for select using (household_id in (select auth_user_households()));

drop policy if exists "invites: members can create" on invitations;
create policy "invites: members can create" on invitations
  for insert with check (
    household_id in (select auth_user_households()) and invited_by = auth.uid()
  );

drop policy if exists "invites: members can delete" on invitations;
create policy "invites: members can delete" on invitations
  for delete using (household_id in (select auth_user_households()));

-- ---------- profiles (Phase 2) ----------------------------------------------
-- Also had the same recursive shape — fix to use the function.
drop policy if exists "profiles: read household members" on profiles;
create policy "profiles: read household members" on profiles
  for select using (
    id = auth.uid()
    or id in (
      select user_id from household_members
      where household_id in (select auth_user_households())
    )
  );

-- ---------- DONE -------------------------------------------------------------
-- After running, hard-refresh the app or sign out/in. The "No household" error
-- should be gone — getHouseholdId() will now return your actual household.
