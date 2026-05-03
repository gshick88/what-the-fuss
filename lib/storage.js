// Tiny localStorage wrappers. SSR-safe (return defaults during render).

const KEYS = {
  baby:          'wtf:baby',
  conversations: 'wtf:conversations',
  saved:         'wtf:saved',
};

function read(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Baby profile
export const getBaby = () => read(KEYS.baby, null);
export const setBaby = (baby) => write(KEYS.baby, baby);
export const clearBaby = () => typeof window !== 'undefined' && window.localStorage.removeItem(KEYS.baby);

// Conversations: array of { id, title, messages: [{role, content, image?, ts}], createdAt, updatedAt }
export const getConversations = () => read(KEYS.conversations, []);
export const setConversations = (list) => write(KEYS.conversations, list);

export function getConversation(id) {
  return getConversations().find((c) => c.id === id) || null;
}

export function upsertConversation(conv) {
  const list = getConversations();
  const idx = list.findIndex((c) => c.id === conv.id);
  const updated = { ...conv, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  setConversations(list);
  return updated;
}

export function deleteConversation(id) {
  setConversations(getConversations().filter((c) => c.id !== id));
}

export function newConversation(seed = {}) {
  return {
    id: crypto.randomUUID(),
    title: seed.title || 'New question',
    messages: seed.messages || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Saved cards: { id, title, snippet, topic, source: convId, savedAt }
export const getSaved = () => read(KEYS.saved, []);
export const setSaved = (list) => write(KEYS.saved, list);

export function saveCard(card) {
  const list = getSaved();
  list.unshift({ id: crypto.randomUUID(), savedAt: Date.now(), ...card });
  setSaved(list);
}

export function deleteCard(id) {
  setSaved(getSaved().filter((c) => c.id !== id));
}

// Helpers
export function babyContextString(baby) {
  if (!baby) return '';
  const parts = [];
  if (baby.name) parts.push(`Name: ${baby.name}`);
  if (baby.dob) {
    const days = Math.floor((Date.now() - new Date(baby.dob)) / 86400000);
    if (days < 0) parts.push(`Status: due in ${Math.abs(days)} days (not yet born)`);
    else if (days < 14) parts.push(`Age: ${days} days old`);
    else if (days < 90) parts.push(`Age: ${Math.floor(days / 7)} weeks old`);
    else parts.push(`Age: ${Math.floor(days / 30)} months old`);
  }
  if (baby.sex) parts.push(`Sex: ${baby.sex}`);
  if (baby.feeding) parts.push(`Feeding: ${baby.feeding}`);
  if (baby.birthWeight) parts.push(`Birth weight: ${baby.birthWeight}`);
  if (baby.notes) parts.push(`Notes: ${baby.notes}`);
  return parts.join(' · ');
}

export function ageLabel(baby) {
  if (!baby?.dob) return '';
  const days = Math.floor((Date.now() - new Date(baby.dob)) / 86400000);
  if (days < 0) return `due in ${Math.abs(days)}d`;
  if (days < 14) return `${days}d`;
  if (days < 90) return `${Math.floor(days / 7)}wk`;
  return `${Math.floor(days / 30)}mo`;
}
