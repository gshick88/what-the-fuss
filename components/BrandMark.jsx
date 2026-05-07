'use client';

// Primary brand mark: a chat-bubble shape (with a tail bottom-left) holding `?!`.
// Reads as "chat + question + cheek" in one glyph. Scales clean to favicon
// size because there are only two shapes (bubble + text).

export default function BrandMark({ size = 32, showWord = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="What The Fuss logo"
      >
        <path
          d="M 12 4 H 52 A 8 8 0 0 1 60 12 V 36 A 8 8 0 0 1 52 44 H 26 L 17 53 L 19 44 H 12 A 8 8 0 0 1 4 36 V 12 A 8 8 0 0 1 12 4 Z"
          className="fill-wtf-berry"
        />
        <text
          x="32"
          y="24"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="26"
          fontWeight="700"
          fill="white"
        >
          ?!
        </text>
      </svg>

      {showWord && (
        <span
          className="font-display font-medium text-wtf-text tracking-tight"
          style={{ fontSize: Math.round(size * 0.78) }}
        >
          What The Fuss
        </span>
      )}
    </div>
  );
}
