'use client';

import { createClient } from './supabase/client';

// All data access goes through here. Functions are async (Supabase is async)
// and return the same shapes the old localStorage version did, so pages need
// to add `await` but mostly don't change otherwise.

const sb = () => createClient();

// ---------- helpers ---------------------------------------------------------

async function getUser() {
  const { data: { user } } = await sb().auth.getUser();
  return user;
}

// Returns the current user's household_id, creating one atomically if they
// don't have one yet. Self-healing — works whether the signup trigger fired
// or not, whether the user is brand new or has been around for months.
//
// Implemented as a SECURITY DEFINER Postgres function (`ensure_household_for_user`)
// so the create-if-missing path bypasses RLS without us granting wide INSERT
// access on household_members from the client.
async function getHouseholdId() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await sb().rpc('ensure_household_for_user');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[wtf] ensure_household_for_user failed:', error);
    return null;
  }
  return data || null;
}

// Verbose variant kept for setBaby's diagnostic path.
async function getHouseholdInfo() {
  const user = await getUser();
  if (!user) return { hid: null, user: null, error: null };

  const { data, error } = await sb().rpc('ensure_household_for_user');
  return { hid: data || null, user, error };
}

// ---------- baby ------------------------------------------------------------

function rowToBaby(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    dob: row.dob || '',
    bornOrDue: row.born_or_due || 'due',
    sex: row.sex || '',
    feeding: row.feeding || '',
    birthWeight: row.birth_weight || '',
    notes: row.notes || '',
  };
}

export async function getBaby() {
  const hid = await getHouseholdId();
  if (!hid) return null;
  const { data } = await sb()
    .from('babies')
    .select('*')
    .eq('household_id', hid)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return rowToBaby(data);
}

export async function setBaby(form) {
  const info = await getHouseholdInfo();
  if (!info.hid) {
    const detail = JSON.stringify({
      userId: info.user?.id || null,
      userEmail: info.user?.email || null,
      rpcError: info.error?.message || null,
      rpcCode: info.error?.code || null,
    });
    throw new Error(`No household. ${detail}`);
  }
  const hid = info.hid;

  const existing = await getBaby();
  const payload = {
    name: form.name || null,
    dob: form.dob || null,
    born_or_due: form.bornOrDue || null,
    sex: form.sex || null,
    feeding: form.feeding || null,
    birth_weight: form.birthWeight || null,
    notes: form.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data } = await sb().from('babies').update(payload).eq('id', existing.id).select().single();
    return rowToBaby(data);
  } else {
    const { data } = await sb()
      .from('babies')
      .insert({ household_id: hid, ...payload })
      .select()
      .single();
    return rowToBaby(data);
  }
}

// ---------- conversations ---------------------------------------------------

function rowToConv(row, messages = []) {
  return {
    id: row.id,
    title: row.title || 'New question',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages,
  };
}

function rowToMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content || '',
    image: row.image_url ? { url: row.image_url, mime: row.image_mime } : null,
    ts: new Date(row.created_at).getTime(),
    createdBy: row.created_by,
  };
}

export async function getConversations() {
  const hid = await getHouseholdId();
  if (!hid) return [];
  const { data } = await sb()
    .from('conversations')
    .select('*')
    .eq('household_id', hid)
    .order('updated_at', { ascending: false });
  return (data || []).map((r) => rowToConv(r));
}

export async function getConversation(id) {
  const { data: conv } = await sb()
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!conv) return null;

  const { data: msgs } = await sb()
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  return rowToConv(conv, (msgs || []).map(rowToMessage));
}

// Create a new conversation, optionally seeded with messages, and return it
// fully hydrated (with messages). This replaces newConversation+upsert from
// the old localStorage flow.
export async function createConversation({ title, messages = [] } = {}) {
  const hid = await getHouseholdId();
  const user = await getUser();
  if (!hid || !user) throw new Error('Not authenticated');

  const { data: conv, error } = await sb()
    .from('conversations')
    .insert({
      household_id: hid,
      title: title || 'New question',
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  if (messages.length) {
    const rows = messages.map((m) => ({
      conversation_id: conv.id,
      role: m.role,
      content: m.content || '',
      image_url: m.image?.url || null,
      image_mime: m.image?.mime || null,
      created_by: user.id,
    }));
    const { error: msgErr } = await sb().from('messages').insert(rows);
    if (msgErr) throw msgErr;
  }

  return getConversation(conv.id);
}

export async function appendMessage(conversationId, message) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await sb().from('messages').insert({
    conversation_id: conversationId,
    role: message.role,
    content: message.content || '',
    image_url: message.image?.url || null,
    image_mime: message.image?.mime || null,
    created_by: user.id,
  });
  if (error) throw error;

  // Bump conversation's updated_at so it sorts to the top of recents.
  await sb()
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function updateConversationTitle(conversationId, title) {
  await sb().from('conversations').update({ title }).eq('id', conversationId);
}

export async function deleteConversation(id) {
  await sb().from('conversations').delete().eq('id', id);
}

// ---------- saved cards -----------------------------------------------------

function rowToCard(row) {
  return {
    id: row.id,
    title: row.title || '',
    snippet: row.snippet || '',
    topic: row.topic || 'general',
    content: row.content || '',
    source: row.source_conversation_id,
    savedAt: new Date(row.saved_at).getTime(),
  };
}

export async function getSaved() {
  const hid = await getHouseholdId();
  if (!hid) return [];
  const { data } = await sb()
    .from('saved_cards')
    .select('*')
    .eq('household_id', hid)
    .order('saved_at', { ascending: false });
  return (data || []).map(rowToCard);
}

export async function saveCard(card) {
  const hid = await getHouseholdId();
  const user = await getUser();
  if (!hid || !user) throw new Error('Not authenticated');

  const { data } = await sb()
    .from('saved_cards')
    .insert({
      household_id: hid,
      source_conversation_id: card.source || null,
      title: card.title || '',
      snippet: card.snippet || '',
      topic: card.topic || 'general',
      content: card.content || '',
      saved_by: user.id,
    })
    .select()
    .single();
  return rowToCard(data);
}

export async function deleteCard(id) {
  await sb().from('saved_cards').delete().eq('id', id);
}

// ---------- image upload ----------------------------------------------------

// Upload a File to the household-scoped storage path, return public URL+mime.
export async function uploadImage(file) {
  const hid = await getHouseholdId();
  if (!hid) throw new Error('No household');

  const ext = (file.name || '').split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${hid}/${crypto.randomUUID()}.${ext}`;

  const { error } = await sb()
    .storage
    .from('wtf-images')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = sb().storage.from('wtf-images').getPublicUrl(path);
  return { url: data.publicUrl, mime: file.type || 'image/jpeg' };
}

// ---------- household / user info -------------------------------------------

export async function getCurrentUser() {
  return await getUser();
}

// Returns the current household's members joined with their profiles
// (email, display_name). Used by the share page.
export async function getHouseholdMembers() {
  const hid = await getHouseholdId();
  if (!hid) return [];

  const { data: members } = await sb()
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', hid)
    .order('joined_at', { ascending: true });

  if (!members?.length) return [];

  const ids = members.map((m) => m.user_id);
  const { data: profs } = await sb()
    .from('profiles')
    .select('id, email, display_name')
    .in('id', ids);

  const byId = new Map((profs || []).map((p) => [p.id, p]));
  return members.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: byId.get(m.user_id)?.email || '',
    display_name: byId.get(m.user_id)?.display_name || '',
  }));
}

// Fetch a single profile (used to attribute messages by their created_by id).
const profileCache = new Map();
export async function getProfile(userId) {
  if (!userId) return null;
  if (profileCache.has(userId)) return profileCache.get(userId);
  const { data } = await sb()
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', userId)
    .maybeSingle();
  profileCache.set(userId, data || null);
  return data || null;
}

// ---------- invitations -----------------------------------------------------

export async function listInvitations() {
  const hid = await getHouseholdId();
  if (!hid) return [];
  const { data } = await sb()
    .from('invitations')
    .select('*')
    .eq('household_id', hid)
    .order('invited_at', { ascending: false });
  return data || [];
}

export async function createInvitation() {
  const hid = await getHouseholdId();
  const user = await getUser();
  if (!hid || !user) throw new Error('Not authenticated');

  const { data, error } = await sb()
    .from('invitations')
    .insert({ household_id: hid, invited_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvitation(id) {
  await sb().from('invitations').delete().eq('id', id);
}

// Calls the SECURITY DEFINER Postgres function that adds the current user to
// the inviting household. Returns the household_id on success.
export async function acceptInvitation(token) {
  const { data, error } = await sb().rpc('accept_invitation', { invite_token: token });
  if (error) throw error;
  return data;
}

// ---------- realtime helpers ------------------------------------------------

// Subscribe to new messages on a conversation. Returns an unsubscribe fn.
export function subscribeToMessages(conversationId, onInsert) {
  const supabase = sb();
  const channel = supabase
    .channel(`conv-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onInsert?.({
          role: payload.new.role,
          content: payload.new.content || '',
          image: payload.new.image_url
            ? { url: payload.new.image_url, mime: payload.new.image_mime }
            : null,
          ts: new Date(payload.new.created_at).getTime(),
          createdBy: payload.new.created_by,
          id: payload.new.id,
        });
      }
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}

// Subscribe to changes on the household's conversation list (new + updated).
// Used by Sidebar to refresh the recents list.
export function subscribeToConversations(householdId, onChange) {
  const supabase = sb();
  const channel = supabase
    .channel(`household-${householdId}-conversations`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `household_id=eq.${householdId}`,
      },
      () => onChange?.()
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}

// Expose householdId helper for components that need it (e.g., Sidebar's
// realtime subscription).
export async function currentHouseholdId() {
  return await getHouseholdId();
}
