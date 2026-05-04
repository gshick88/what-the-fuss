'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'wtf:theme';

// Inline script string that runs before React hydrates to prevent the flash.
// Reads stored theme (or defaults to 'light') and toggles `.dark` on <html>.
export const themeBootstrapScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored === 'dark';
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setTheme(stored === 'dark' ? 'dark' : 'light');
  }, []);

  function toggle() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.classList.toggle('dark', next === 'dark');
      } catch {}
      return next;
    });
  }

  function set(next) {
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    } catch {}
  }

  return { theme, toggle, set };
}
