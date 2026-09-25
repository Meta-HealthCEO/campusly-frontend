'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TILE_LABEL, examMapLabel, layoutExamMap, type ExamMapTile, type ExamTopic, type TileLevel } from '@/lib/readiness/exam-map';

const TILE_CLASS: Record<TileLevel, string> = {
  secure: 'bg-tile-secure text-tile-secure-ink',
  building: 'bg-tile-building text-tile-building-ink',
  weak: 'bg-tile-weak text-tile-weak-ink',
  untested: 'border border-dashed border-input bg-muted text-muted-foreground',
};

/**
 * Legend swatches: the tile fill ringed in its ink, so the pale building fill (light) and the soft fills (dark)
 * stay visible against the card at 12px.
 */
const LEGEND_CLASS: Record<Exclude<TileLevel, 'untested'>, string> = {
  secure: 'bg-tile-secure border-tile-secure-ink',
  building: 'bg-tile-building border-tile-building-ink',
  weak: 'bg-tile-weak border-tile-weak-ink',
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
                className={cn('flex min-w-0 flex-col justify-between overflow-hidden rounded-control p-2 sm:p-2.5', TILE_CLASS[tile.level])}
                style={{ flexGrow: tile.marks, flexBasis: 0 }}
              >
                <span className="line-clamp-2 font-heading text-small font-semibold leading-tight break-words hyphens-auto">{tile.name}</span>
                <span className="truncate font-heading text-small font-bold tabular-nums">
                  {tile.mastery === null ? TILE_LABEL.untested : `${tile.mastery}%`} · {tile.marks} marks
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
          {(['secure', 'building', 'weak'] as const).map((level) => (
            <li key={level} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-3 rounded-[3px] border-2', LEGEND_CLASS[level])} />
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
