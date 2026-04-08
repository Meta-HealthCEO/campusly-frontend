'use client';

import { getSubjectColours, getSubjectImage } from './subject-colours';

interface BookCoverProps {
  subjectName: string;
  gradeName: string;
  chapterCount: number;
  onClick: () => void;
}

function displayName(name: string): string {
  return name
    .replace(/^Economic and Management Sciences$/i, 'EMS')
    .replace(/^Computer Applications Technology$/i, 'Computer Applications');
}

export function BookCover({ subjectName, gradeName, chapterCount, onClick }: BookCoverProps) {
  const { from, to } = getSubjectColours(subjectName);
  const imageUrl = getSubjectImage(subjectName);
  const title = displayName(subjectName);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group perspective-[800px]"
    >
      <div className="relative transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:[transform:rotateY(-6deg)_rotateX(3deg)] [transform-style:preserve-3d]">
        {/* Spine */}
        <div
          className="absolute left-0 top-[3px] bottom-[3px] w-[8px] rounded-l-[3px] z-10"
          style={{
            background: `linear-gradient(180deg, ${from}, ${to})`,
            filter: 'brightness(0.5)',
            boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3)',
          }}
        />

        {/* Page edges — right */}
        <div
          className="absolute right-[-3px] top-[6px] bottom-[6px] w-[5px] rounded-r-[1px]"
          style={{
            background: 'repeating-linear-gradient(180deg, #f5f2ed 0px, #e8e4de 1px, #f5f2ed 2px)',
            boxShadow: '1px 0 2px rgba(0,0,0,0.08)',
          }}
        />

        {/* Page edges — bottom */}
        <div
          className="absolute bottom-[-2px] left-[12px] right-[2px] h-[4px] rounded-b-[1px]"
          style={{
            background: 'repeating-linear-gradient(90deg, #f5f2ed 0px, #e8e4de 1px, #f5f2ed 2px)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />

        {/* Main cover */}
        <div
          className="relative w-[124px] h-[172px] sm:w-[136px] sm:h-[188px] rounded-r-md rounded-l-[1px] overflow-hidden flex flex-col"
          style={{
            boxShadow: `
              2px 2px 6px rgba(0,0,0,0.18),
              6px 6px 20px ${from}25,
              0 12px 28px rgba(0,0,0,0.10)
            `,
            marginLeft: '8px',
          }}
        >
          {/* Photo background */}
          <div className="absolute inset-0">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Colour overlay to tint the image */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${from}cc 0%, ${to}bb 100%)`,
                mixBlendMode: 'multiply',
              }}
            />
            {/* Dark gradient for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 100%)',
              }}
            />
          </div>

          {/* Content on top of image */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Top badges */}
            <div className="flex justify-between items-start px-2.5 pt-2.5">
              <span
                className="text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-[2px] rounded-sm backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.95)' }}
              >
                CAPS
              </span>
              <span
                className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-[2px] rounded-sm backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.9)' }}
              >
                {gradeName.replace('Grade ', 'Gr ')}
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Title area at bottom */}
            <div
              className="px-2.5 py-2.5 backdrop-blur-[2px]"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
              }}
            >
              <div className="text-white text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 drop-shadow-sm">
                {title}
              </div>
              <div className="text-white/60 text-[9px] sm:text-[10px] font-medium mt-0.5">
                {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
              </div>
            </div>
          </div>

          {/* Shine overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: 'linear-gradient(125deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 20%, transparent 50%, transparent 80%, rgba(255,255,255,0.02) 100%)',
            }}
          />
        </div>
      </div>
    </button>
  );
}
