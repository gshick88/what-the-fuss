/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Berry Bowl palette
        wtf: {
          bg:        '#FAF5EE', // warm cream
          card:      '#FFFFFF',
          text:      '#2A1A2A', // deep plum-black
          'text-2':  '#5A3A4A',
          'text-3':  '#7A5A6A',
          muted:     '#A89098',
          border:    '#E8DDD8',
          'border-warm': '#D8C8D0',
          berry:     '#7A3A5A', // primary
          'berry-dark': '#5A2A45',
          'berry-soft': '#F2E0E8',
          honey:     '#E8A030', // secondary pop
          'honey-soft': '#FBEBD2',
          sage:      '#88A87A', // success/calm
          'sage-soft': '#E8F0E0',
          danger:    '#A32D2D',
          'danger-soft': '#FCEBEB',
          night:     '#14100D', // 3am mode bg
          'night-2': '#241820',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
