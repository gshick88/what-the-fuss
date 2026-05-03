'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { getBaby, getSaved, deleteCard } from '@/lib/storage';
import { COLOR_DOT, COLOR_TEXT } from '@/lib/topics';

const TOPIC_FILTERS = ['All', 'Sleep', 'Feeding', 'Poop', 'Fever', 'Skin', 'Other'];

function topicForCard(card) {
  const t = (card.topic || '').toLowerCase();
  if (t.includes('sleep')) return { label: 'Sleep', color: 'berry' };
  if (t.includes('feed')) return { label: 'Feeding', color: 'honey' };
  if (t.includes('poop')) return { label: 'Poop', color: 'sage' };
  if (t.includes('fever') || t.includes('med')) return { label: 'Fever', color: 'danger' };
  if (t.includes('rash') || t.includes('skin')) return { label: 'Skin', color: 'honey' };
  return { label: 'Other', color: 'berry' };
}

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 7))}w`;
}

export default function SavedPage() {
  const [baby, setBaby] = useState(null);
  const [cards, setCards] = useState([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setBaby(getBaby());
    setCards(getSaved());
  }, []);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      const t = topicForCard(c).label;
      if (filter !== 'All' && t !== filter) return false;
      if (query && !(`${c.title} ${c.snippet}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [cards, filter, query]);

  function handleDelete(id) {
    deleteCard(id);
    setCards(getSaved());
  }

  return (
    <>
      <Header baby={baby} back title="Saved" />

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 pt-3 pb-6">
        <div className="text-[11px] text-wtf-text-3 mb-3">
          {cards.length} card{cards.length === 1 ? '' : 's'} · the 3am bookmarks
        </div>

        <div className="bg-white border border-wtf-border rounded-full px-3 py-2 flex items-center gap-2 mb-3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A89098" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find that one about..."
            className="wtf-input text-[13px]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
          {TOPIC_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-3 py-1 rounded-full whitespace-nowrap border transition-colors ${
                filter === f
                  ? 'bg-wtf-berry text-white border-wtf-berry font-medium'
                  : 'bg-white text-wtf-text-2 border-wtf-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-wtf-text-3 text-[13px] mt-12">
            {cards.length === 0 ? "Nothing saved yet. Tap 'Save card' under any answer." : 'Nothing matches.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => {
              const t = topicForCard(c);
              return (
                <div key={c.id} className="bg-white border border-wtf-border rounded-wtf-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[t.color]}`} />
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${COLOR_TEXT[t.color]}`}>{t.label}</span>
                    <span className="text-[10px] text-wtf-muted ml-auto">{timeAgo(c.savedAt)}</span>
                    <button onClick={() => handleDelete(c.id)} className="text-wtf-muted text-[10px] px-2">delete</button>
                  </div>
                  <div className="text-[13px] font-medium text-wtf-text">{c.title}</div>
                  <div className="text-[11px] text-wtf-text-3 leading-relaxed mt-1">{c.snippet}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
