'use client';

export default function BrandMark({ size = 32, showWord = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-[8px] bg-wtf-berry text-white flex items-center justify-center font-medium leading-none"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        ?!
      </div>
      {showWord && (
        <span className="font-display font-medium text-wtf-text tracking-tight" style={{ fontSize: 26 }}>
          What The Fuss
        </span>
      )}
    </div>
  );
}
