'use client';

// Single inline-SVG icon set for topic chips. Stroke uses currentColor so the
// parent's text color drives the icon color.
export default function TopicIcon({ name, size = 16, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };

  switch (name) {
    case 'moon':
      return (
        <svg {...common}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
      );
    case 'bottle':
      return (
        <svg {...common}>
          <path d="M9 2h6M9 2v3M15 2v3M8 5h8a1 1 0 0 1 1 1v2l-1 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10L7 8V6a1 1 0 0 1 1-1z" />
          <path d="M8 12h8" />
        </svg>
      );
    case 'face':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="10" r="0.8" fill="currentColor" />
          <circle cx="15" cy="10" r="0.8" fill="currentColor" />
          <path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5" />
        </svg>
      );
    case 'thermometer':
      return (
        <svg {...common}>
          <path d="M14 4a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0V4z" />
          <path d="M12 8v6" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M3 12c2-3 5-5 9-5s7 2 9 5c-2 3-5 5-9 5s-7-2-9-5z" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
  }
}
