'use client';

import { COLOR_BG, COLOR_DOT } from '@/lib/topics';

export default function TopicChip({ topic, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-wtf-border rounded-wtf p-2.5 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform hover:border-wtf-border-warm"
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${COLOR_BG[topic.color]}`}>
        <span className={`w-2 h-2 rounded-full ${COLOR_DOT[topic.color]}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-wtf-text leading-tight">{topic.label}</div>
        <div className="text-[11px] text-wtf-muted leading-tight mt-0.5 truncate">{topic.sub}</div>
      </div>
    </button>
  );
}
