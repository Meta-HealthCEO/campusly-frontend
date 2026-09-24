export interface RecipientOption {
  id: string;
  name: string;
  role: string;
}

type Raw = Record<string, unknown>;

const idOf = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Raw;
    return String(v.id ?? v._id ?? '');
  }
  return '';
};

/**
 * A learner's parents as message recipients (their user accounts), from
 * GET /students/:id. The API returns them as `guardianIds` (Parent records with
 * the user populated); older shapes used `parentIds` or `parents`. A parent
 * whose user isn't included can't be messaged, so it's left out.
 */
export function recipientsFromStudent(student: Raw): RecipientOption[] {
  const list = (student.guardianIds ?? student.parentIds ?? student.parents ?? []) as unknown[];
  const out: RecipientOption[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const parent = entry as Raw;
    const user = parent.userId;
    if (!user || typeof user !== 'object') continue;
    const u = user as Raw;
    const id = idOf(u);
    if (!id || out.some((r) => r.id === id)) continue;
    const name = `${(u.firstName as string) ?? ''} ${(u.lastName as string) ?? ''}`.trim() || 'Parent';
    const relationship = typeof parent.relationship === 'string' ? ` (${parent.relationship})` : '';
    out.push({ id, name: `${name}${relationship}`, role: 'parent' });
  }
  return out;
}
