/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}', // topic.js holds class strings — Tailwind needs to see them
  ],
  theme: {
    extend: {
      colors: {
        // Berry Bowl tokens — values come from CSS variables in globals.css
        // so they swap automatically between light and .dark themes.
        wtf: {
          bg:           'var(--wtf-bg)',
          card:         'var(--wtf-card)',
          text:         'var(--wtf-text)',
          'text-2':     'var(--wtf-text-2)',
          'text-3':     'var(--wtf-text-3)',
          muted:        'var(--wtf-muted)',
          border:       'var(--wtf-border)',
          'border-warm':'var(--wtf-border-warm)',
          berry:        'var(--wtf-berry)',
          'berry-dark': 'var(--wtf-berry-dark)',
          'berry-soft': 'var(--wtf-berry-soft)',
          honey:        'var(--wtf-honey)',
          'honey-soft': 'var(--wtf-honey-soft)',
          sage:         'var(--wtf-sage)',
          'sage-soft':  'var(--wtf-sage-soft)',
          danger:       'var(--wtf-danger)',
          'danger-soft':'var(--wtf-danger-soft)',
        },
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        'wtf-sm': '8px',
        'wtf':    '10px',
        'wtf-lg': '14px',
        'wtf-xl': '18px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'breathe': 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.08)', opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
