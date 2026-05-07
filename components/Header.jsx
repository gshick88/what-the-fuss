'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandMark from './BrandMark';
import { ageLabel } from '@/lib/storage';

export default function Header({ baby, back, title, right, displayTitle }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 bg-wtf-bg/90 backdrop-blur border-b border-wtf-border/60">
      <div className="max-w-md md:max-w-lg mx-auto px-4 h-[72px] flex items-center gap-2">
        {back ? (
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 text-wtf-text"
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <Link href="/" className="flex items-center"><BrandMark /></Link>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <div className={`${displayTitle ? 'font-display text-[26px]' : 'text-[24px]'} font-medium text-wtf-text truncate`}>
              {title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {right}
          {baby?.name && (
            <Link
              href="/setup"
              className="text-[20px] px-3.5 py-1 rounded-full bg-wtf-berry-soft text-wtf-berry-dark font-medium"
            >
              {baby.name}{ageLabel(baby) ? ` · ${ageLabel(baby)}` : ''}
            </Link>
          )}
          <Link
            href="/setup"
            className="w-11 h-11 rounded-full bg-wtf-berry-soft text-wtf-berry-dark text-[20px] font-medium flex items-center justify-center"
            aria-label="Profile"
          >
            {baby?.name?.[0]?.toUpperCase() || '+'}
          </Link>
        </div>
      </div>
    </header>
  );
}
