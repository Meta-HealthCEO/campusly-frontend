/** Colour for a percentage mark: good (70+), fine (50–69), at risk (40–49), failing (below 40). */
export function gradeColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 70) return 'text-success';
  if (pct >= 50) return 'text-foreground';
  if (pct >= 40) return 'text-attention';
  // Failing is the weak mastery colour (orange), never the error red (final review 7).
  return 'text-weak-strong';
}
