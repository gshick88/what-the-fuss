'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Read a File as base64 (no data URL prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Composer({ value, onChange, onSend, placeholder = 'Ask anything...', disabled }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageMime, setImageMime] = useState(null);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const data = await fileToBase64(f);
    setImageData(data);
    setImageMime(f.type || 'image/jpeg');
    setImagePreview(URL.createObjectURL(f));
    e.target.value = '';
  }

  function clearImage() {
    setImagePreview(null);
    setImageData(null);
    setImageMime(null);
  }

  async function send() {
    if (disabled) return;
    if (!value?.trim() && !imageData) return;
    const payload = {
      text: value?.trim() || '',
      image: imageData ? { mime: imageMime, data: imageData } : null,
    };
    onSend?.(payload);
    onChange?.('');
    clearImage();
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="w-full">
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2 bg-white border border-wtf-border rounded-wtf p-2">
          <img src={imagePreview} alt="" className="w-14 h-14 rounded-md object-cover" />
          <div className="text-[18px] text-wtf-text-2 flex-1">Photo attached</div>
          <button onClick={clearImage} className="text-wtf-muted text-[16px] px-2">Remove</button>
        </div>
      )}

      <div className="bg-white border border-wtf-border-warm rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-2 shadow-sm">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-full bg-wtf-bg border border-wtf-border flex items-center justify-center text-wtf-text-3 active:scale-95 transition-transform shrink-0"
          aria-label="Attach photo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <circle cx="12" cy="13" r="3" />
            <path d="M9 6l1.5-2h3L15 6" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />

        <textarea
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="wtf-input py-2 leading-tight"
          style={{ minHeight: 24, maxHeight: 120 }}
        />

        <button
          onClick={() => router.push('/voice')}
          className="w-9 h-9 rounded-full bg-wtf-bg border border-wtf-border flex items-center justify-center text-wtf-text-3 active:scale-95 transition-transform shrink-0"
          aria-label="Voice mode"
          title="Hands-free voice mode"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>

        <button
          onClick={send}
          disabled={disabled || (!value?.trim() && !imageData)}
          className="w-10 h-10 rounded-full bg-wtf-berry text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shrink-0"
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
