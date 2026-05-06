'use client';

import { COLOR_BG, COLOR_TEXT } from '@/lib/topics';
import TopicIcon from './TopicIcon';

export default function TopicChip({ topic, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-wtf-border rounded-wtf p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-all hover:border-wtf-border-warm hover:shadow-sm group"
    >
      <div className={`w-9 h-9 rounded-wtf-sm flex items-center justify-center shrink-0 ${COLOR_BG[topic.color]} ${COLOR_TEXT[topic.color]}`}>
        <TopicIcon name={topic.icon} size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-[30px] font-medium text-wtf-text leading-tight">{topic.label}</div>
        <div className="text-[22px] text-wtf-muted leading-tight mt-0.5 truncate">{topic.sub}</div>
      </div>
    </button>
  );
}
