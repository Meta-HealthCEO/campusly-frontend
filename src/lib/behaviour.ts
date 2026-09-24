/** One behaviour log: the kinds, categories and wording, matching the server's rules. */
export type BehaviourKind = 'merit' | 'demerit' | 'incident';
export type Severity = 'low' | 'medium' | 'high';

export const BEHAVIOUR_KINDS: Array<{ value: BehaviourKind; label: string; hint: string }> = [
  { value: 'merit', label: 'Merit', hint: 'Something to praise' },
  { value: 'demerit', label: 'Demerit', hint: 'A rule broken' },
  { value: 'incident', label: 'Incident', hint: 'Something more serious' },
];

export const BEHAVIOUR_CATEGORIES: Record<BehaviourKind, Array<{ value: string; label: string }>> = {
  merit: [
    { value: 'effort', label: 'Effort' },
    { value: 'kindness', label: 'Kindness' },
    { value: 'academic', label: 'Good work' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'service', label: 'Helping out' },
    { value: 'sport', label: 'Sport and culture' },
  ],
  demerit: [
    { value: 'late', label: 'Late' },
    { value: 'homework', label: 'Homework not done' },
    { value: 'disruption', label: 'Disrupting class' },
    { value: 'uniform', label: 'Uniform' },
    { value: 'respect', label: 'Disrespect' },
    { value: 'language', label: 'Bad language' },
    { value: 'other', label: 'Other' },
  ],
  incident: [
    { value: 'fighting', label: 'Fighting' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'property', label: 'Damage or theft' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' },
  ],
};

export const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/** The chip colour for each kind (semantic tokens). */
export const KIND_TONE: Record<BehaviourKind, string> = {
  merit: 'bg-success-soft text-success',
  demerit: 'bg-attention-soft text-attention',
  incident: 'bg-destructive-soft text-destructive',
};

const KIND_LABEL: Record<BehaviourKind, string> = { merit: 'Merit', demerit: 'Demerit', incident: 'Incident' };

/** "+2", "−1", or nothing for an incident. */
export function pointsLabel(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${Math.abs(points)}`;
  return '';
}

export function categoryLabel(kind: BehaviourKind, category: string): string {
  return BEHAVIOUR_CATEGORIES[kind].find((c) => c.value === category)?.label ?? category;
}

const ALL_CATEGORIES = [
  ...BEHAVIOUR_CATEGORIES.merit,
  ...BEHAVIOUR_CATEGORIES.demerit,
  ...BEHAVIOUR_CATEGORIES.incident,
];

/**
 * A category's human label when the kind isn't known up front (e.g. a mixed
 * feed of demerits and incidents on the parent portal). Falls back to the
 * raw value if it doesn't match any known category.
 */
export function anyCategoryLabel(category: string): string {
  return ALL_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** "Merit +2 · Kindness", as the timeline words it. */
export function entryLabel(e: { kind: BehaviourKind; category: string; points: number }): string {
  const points = pointsLabel(e.points);
  return `${KIND_LABEL[e.kind]}${points ? ` ${points}` : ''} · ${categoryLabel(e.kind, e.category)}`;
}

export interface LogForm {
  studentId: string;
  kind: BehaviourKind;
  category: string;
  note: string;
}

/** What's missing before a log can be sent, in the server's words; null when it can be sent. */
export function logProblem(form: LogForm): string | null {
  if (!form.studentId) return 'Pick a learner.';
  if (!form.category) return `Pick what the ${form.kind} is for.`;
  if (form.kind !== 'merit' && !form.note.trim()) return 'Say briefly what happened.';
  return null;
}

/** One item on a learner's behaviour timeline (GET /behaviour/student/:id). */
export interface TimelineItem {
  id: string;
  kind: BehaviourKind | 'referral';
  at: string;
  label: string;
  detail: string;
  by: string | null;
}

export function timelineTone(kind: TimelineItem['kind']): string {
  return kind === 'referral' ? 'bg-info-soft text-info' : KIND_TONE[kind];
}

const count = (n: number, one: string, many: string): string => (n === 0 ? `no ${many}` : n === 1 ? `1 ${one}` : `${n} ${many}`);

/** "2 merits · 1 demerit · no incidents" */
export function summaryLine(s: { merits: number; demerits: number; incidents: number; net?: number }): string {
  if (s.merits + s.demerits + s.incidents === 0) return 'Nothing logged yet';
  return [count(s.merits, 'merit', 'merits'), count(s.demerits, 'demerit', 'demerits'), count(s.incidents, 'incident', 'incidents')].join(' · ');
}
