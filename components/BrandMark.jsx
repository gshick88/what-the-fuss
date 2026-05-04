'use client';

export default function BrandMark({ size = 22, showWord = true }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-[6px] bg-wtf-berry text-white flex items-center justify-center font-medium leading-none"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        ?!
      </div>
      {showWord && (
        <span className="font-display font-medium text-wtf-text tracking-tight" style={{ fontSize: 16 }}>
          What The Fuss
        </span>
      )}
    </div>
  );
}
