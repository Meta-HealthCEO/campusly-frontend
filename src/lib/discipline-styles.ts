/**
 * Discipline chip colours. DisciplineTable is shared with /admin/discipline,
 * which must look as it did before the teacher portal work (look spec §2), so
 * these keep their original palette. The teacher Behaviour redesign (phase 4)
 * gets its own, token-based styles.
 */
export const DISCIPLINE_SEVERITY_STYLES: Record<string, string> = {
  minor: 'bg-slate-100 text-slate-700',
  moderate: 'bg-amber-100 text-amber-700',
  serious: 'bg-orange-100 text-orange-700',
  critical: 'bg-destructive/10 text-destructive',
};

export const DISCIPLINE_STATUS_STYLES: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  escalated: 'bg-destructive/10 text-destructive',
};
