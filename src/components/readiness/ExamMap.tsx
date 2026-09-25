'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TILE_LABEL, examMapLabel, layoutExamMap, type ExamMapTile, type ExamTopic, type TileLevel } from '@/lib/readiness/exam-map';

/**
 * Ruling O1 (revised 2): tiles are deep solid fills with white ink, the same in both themes; an untested topic is the
 * card surface in a dashed outline, never a colour.
 */
const TILE_CLASS: Record<TileLevel, string> = {
  secure: 'bg-tile-secure text-tile-secure-ink',
  building: 'bg-tile-building text-tile-building-ink',
  weak: 'bg-tile-weak text-tile-weak-ink',
  untested: 'border border-dashed border-border bg-card text-muted-foreground',
};

/** Legend: the status dot (8px, the tile colour) beside its word, as on every chip. */
const LEGEND_CLASS: Record<Exclude<TileLevel, 'untested'>, string> = {
  secure: 'before:bg-mark-secure',
  building: 'before:bg-mark-building',
  weak: 'before:bg-mark-weak',
};

interface ExamMapProps {
  paper: string;
  topics: readonly ExamTopic[];
  className?: string;
}

/** The exam, mapped (spec §1): rows by paper section, block size = marks, colour = mastery. */
export function ExamMap({ paper, topics, className }: ExamMapProps) {
  const rows = useMemo(() => layoutExamMap(topics), [topics]);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">This paper has no topics in its blueprint yet.</p>;
  }
  const tiles = rows.flatMap((r) => r.tiles);
  return (
    <figure className={cn('space-y-3', className)}>
      <div
        role="img"
        aria-label={examMapLabel(paper, rows)}
        className="grid h-64 gap-1 sm:h-72"
        style={{ gridTemplateRows: rows.map((r) => `${r.marks}fr`).join(' ') }}
      >
        {rows.map((row) => (
          <div key={row.section} className="flex min-w-0 gap-1">
            {row.tiles.map((tile: ExamMapTile) => (
              <div
                key={tile.id}
                className={cn('@container flex min-w-0 flex-col justify-between overflow-hidden rounded-control p-2 sm:p-2.5', TILE_CLASS[tile.level])}
                style={{ flexGrow: tile.marks, flexBasis: 0 }}
              >
                <span className="line-clamp-2 font-heading text-sm font-bold leading-tight break-words hyphens-auto">{tile.name}</span>
                {/* Ruling O2: never an ellipsis. Side by side when the tile is wide enough, stacked when it is not. */}
                <span className="flex flex-col font-heading text-small font-semibold leading-tight tabular-nums @min-[7.5rem]:flex-row @min-[7.5rem]:gap-1">
                  <span>{tile.mastery === null ? TILE_LABEL.untested : `${tile.mastery}%`}</span>
                  <span aria-hidden="true" className="hidden @min-[7.5rem]:inline">·</span>
                  <span>{tile.marks} marks</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1">
          {(['secure', 'building', 'weak'] as const).map((level) => (
            <li
              key={level}
              className={cn("inline-flex items-center gap-[7px] text-small font-semibold text-foreground before:size-2 before:rounded-full before:content-['']", LEGEND_CLASS[level])}
            >
              {TILE_LABEL[level]}
            </li>
          ))}
        </ul>
      </figcaption>
      <ul className="sr-only">
        {tiles.map((t: ExamMapTile) => (
          <li key={t.id}>{t.name}: {t.marks} marks, {TILE_LABEL[t.level]}{t.mastery === null ? '' : `, ${t.mastery}%`}</li>
        ))}
      </ul>
    </figure>
  );
}
