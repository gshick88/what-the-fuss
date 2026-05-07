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

// Stage 1: a user has exactly one household (created by the signup trigger).
// Stage 2 will introduce multi-household; this returns the first one for now.
async function getHouseholdId() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await sb()
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  return data?.household_id || null;
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
  const hid = await getHouseholdId();
  if (!hid) throw new Error('No household');

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
    role: row.role,
    content: row.content || '',
    image: row.image_url ? { url: row.image_url, mime: row.image_mime } : null,
    ts: new Date(row.created_at).getTime(),
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

export async function getHouseholdMembers() {
  const hid = await getHouseholdId();
  if (!hid) return [];
  const { data } = await sb()
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', hid);
  return data || [];
}
