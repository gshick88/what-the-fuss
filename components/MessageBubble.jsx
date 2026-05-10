'use client';

import { useState } from 'react';
import { saveCard } from '@/lib/db';

function renderMarkdown(text) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n');
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (isList) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inlineMd(l.replace(/^\s*[-*]\s+/, '')) }} />
          ))}
        </ul>
      );
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: inlineMd(block.replace(/\n/g, '<br/>')) }} />;
  });
}

function inlineMd(s) {
  const esc = s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export default function MessageBubble({ message, onSaved, authorLabel }) {
  const [saved, setSaved] = useState(false);
  const [savingErr, setSavingErr] = useState(null);

  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] flex flex-col gap-1.5 items-end animate-slide-up">
        {authorLabel && authorLabel !== 'you' && (
          <div className="fs-tiny text-wtf-text-3 px-1">{authorLabel} asked</div>
        )}
        {message.image?.url && (
          <div className="bg-wtf-berry rounded-wtf-lg p-1">
            <img src={message.image.url} alt="" className="rounded-wtf object-cover max-h-56 max-w-[220px]" />
          </div>
        )}
        {message.content && (
          <div className="bg-wtf-berry text-white px-3.5 py-2.5 rounded-wtf-lg rounded-br-[4px] fs-message leading-snug whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    );
  }

  async function handleSave() {
    const title = (message.content || '').split('\n')[0].slice(0, 60).replace(/\.$/, '') || 'Saved answer';
    const snippet = (message.content || '').slice(0, 160);
    try {
      await saveCard({
        title,
        snippet,
        topic: message.topic || 'general',
        source: message.convId || null,
        content: message.content,
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setSavingErr('Could not save.');
    }
  }

  return (
    <div className="self-start max-w-[92%] animate-slide-up">
      <div className="bg-white border border-wtf-border rounded-wtf-lg rounded-bl-[4px] px-4 py-3 leading-relaxed text-wtf-text msg-content">
        {renderMarkdown(message.content)}
      </div>
      <div className="mt-2 flex gap-1.5 flex-wrap items-center">
        <button
          onClick={handleSave}
          disabled={saved}
          className={`fs-sub px-3 py-1 rounded-full font-medium transition-colors ${saved ? 'bg-wtf-sage-soft text-[#3B6D11]' : 'bg-wtf-berry-soft text-wtf-berry-dark hover:bg-wtf-berry-soft/80'}`}
        >
          {saved ? 'Saved' : 'Save card'}
        </button>
        {savingErr && <span className="fs-tiny text-wtf-danger">{savingErr}</span>}
      </div>
    </div>
  );
}
