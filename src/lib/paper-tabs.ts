export const PAPER_TABS = ['paper', 'memo', 'assignments', 'marking'] as const;
export type PaperTab = (typeof PAPER_TABS)[number];

/** The paper page tab named in a link (?tab=), or the paper itself for anything else. */
export function paperTabFromParam(value: string | null): PaperTab {
  return (PAPER_TABS as readonly string[]).includes(value ?? '') ? (value as PaperTab) : 'paper';
}
