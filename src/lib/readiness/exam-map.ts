import { MASTERY_LABEL, marksToGain, masteryLevel, type MasteryLevel } from './mastery';

/** One topic of a paper's blueprint: its marks in the final exam and the learner's mastery (null = no evidence yet). */
export interface ExamTopic {
  id: string;
  name: string;
  section: string;
  marks: number;
  mastery: number | null;
}

export type TileLevel = MasteryLevel | 'untested';

export interface ExamMapTile {
  id: string;
  name: string;
  marks: number;
  mastery: number | null;
  level: TileLevel;
  marksToGain: number | null;
}

export interface ExamMapRow {
  section: string;
  marks: number;
  tiles: ExamMapTile[];
}

export const TILE_LABEL: Record<TileLevel, string> = { ...MASTERY_LABEL, untested: 'Not yet tested' };

/** Rows by paper section (first-seen order); each tile's size is its marks, its colour its mastery (spec §4). */
export function layoutExamMap(topics: readonly ExamTopic[]): ExamMapRow[] {
  const rows = new Map<string, ExamMapTile[]>();
  for (const topic of topics) {
    if (!(topic.marks > 0)) continue;
    const tested = topic.mastery !== null;
    const tile: ExamMapTile = {
      id: topic.id,
      name: topic.name,
      marks: topic.marks,
      mastery: topic.mastery,
      level: tested ? masteryLevel(topic.mastery as number) : 'untested',
      marksToGain: tested ? marksToGain(topic.marks, topic.mastery as number) : null,
    };
    rows.set(topic.section, [...(rows.get(topic.section) ?? []), tile]);
  }
  return [...rows].map(([section, tiles]) => ({ section, tiles, marks: tiles.reduce((sum: number, x: ExamMapTile) => sum + x.marks, 0) }));
}

/** The map's accessible name: the paper's size and how the learner stands across it. */
export function examMapLabel(paper: string, rows: readonly ExamMapRow[]): string {
  const tiles = rows.flatMap((r: ExamMapRow) => r.tiles);
  const total = tiles.reduce((sum: number, x: ExamMapTile) => sum + x.marks, 0);
  const count = (level: TileLevel) => tiles.filter((x: ExamMapTile) => x.level === level).length;
  const parts = (['weak', 'building', 'secure', 'untested'] as const)
    .filter((level: TileLevel) => count(level) > 0)
    .map((level: TileLevel) => `${count(level)} ${TILE_LABEL[level].toLowerCase()}`);
  const topics = `${tiles.length} ${tiles.length === 1 ? 'topic' : 'topics'}`;
  return `${paper}: ${total} marks in ${topics}${parts.length > 0 ? `; ${parts.join(', ')}` : ''}`;
}

/** "Marks at stake": marks to gain across tested topics, to the whole mark. */
export function totalMarksToGain(rows: readonly ExamMapRow[]): number {
  return Math.round(rows.flatMap((r: ExamMapRow) => r.tiles).reduce((sum: number, x: ExamMapTile) => sum + (x.marksToGain ?? 0), 0));
}

/** Topics by marks to gain, most first; untested topics last in blueprint order. */
export function topicsByGain(rows: readonly ExamMapRow[]): ExamMapTile[] {
  const tiles = rows.flatMap((r: ExamMapRow) => r.tiles);
  const tested = tiles.filter((x: ExamMapTile) => x.marksToGain !== null)
    .sort((a: ExamMapTile, b: ExamMapTile) => (b.marksToGain ?? 0) - (a.marksToGain ?? 0));
  return [...tested, ...tiles.filter((x: ExamMapTile) => x.marksToGain === null)];
}

/**
 * A tile's minimum width (ruling O1 final): its longest word at the tile's 19px bold, plus its padding, so text never
 * shrinks or breaks mid-word; narrower than that, the tile moves to its row's next line. Capped at the row width.
 */
export function tileMinWidth(name: string): string {
  const longest = name.split(/\s+/).reduce((max: number, word: string) => Math.max(max, word.length), 0);
  return `min(100%, calc(${longest}ch + 1.25rem))`;
}
