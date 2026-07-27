// ============================================================
// Curriculum context derivation — pure logic shared by the paper,
// assignment, and lesson wizards. Extracted from
// hooks/useCurriculumPreparation.ts (which re-exports everything here).
// ============================================================

import { resolveId } from '@/lib/api-helpers';
import type { CurriculumNodeItem, Grade, Subject } from '@/types';

export type CurriculumContextStatus = 'idle' | 'preparing' | 'ready' | 'error';

export interface CurriculumGenerationContext {
  subjectCode: string;
  subjectName: string;
  gradeLevel: number;
  gradeName: string;
  term: number;
}

export type AcademicGradeRecord = Grade & {
  _id?: string;
  orderIndex?: number;
};

export type AcademicSubjectRecord = Subject & {
  _id?: string;
  gradeIds?: Array<string | { id?: string; _id?: string }>;
};

export const CAPS_SUBJECT_NAMES: Record<string, string> = {
  ACCOUNTING: 'Accounting',
  AFRIKAANSFAL: 'Afrikaans Eerste Addisionele Taal',
  AFRIKAANSHL: 'Afrikaans Huistaal',
  BUSINESSSTUDIES: 'Business Studies',
  CAT: 'Computer Applications Technology',
  ECONOMICS: 'Economics',
  EMS: 'Economic and Management Sciences',
  ENGLISHFAL: 'English First Additional Language',
  ENGLISHHL: 'English Home Language',
  GEOGRAPHY: 'Geography',
  HISTORY: 'History',
  IT: 'Information Technology',
  LIFEORIENTATION: 'Life Orientation',
  LIFESCI: 'Life Sciences',
  LIFESKILLS: 'Life Skills',
  MATHEMATICS: 'Mathematics',
  MATHLIT: 'Mathematical Literacy',
  NATSCIENCES: 'Natural Sciences',
  NSTECH: 'Natural Sciences and Technology',
  PHYSSCI: 'Physical Sciences',
  SOCIALSCIENCES: 'Social Sciences',
  TECHNOLOGY: 'Technology',
  TOURISM: 'Tourism',
  VISUALARTS: 'Creative Arts: Visual Arts',
};

export const ACADEMIC_SUBJECT_CODES: Record<string, string> = {
  ACCOUNTING: 'ACC',
  AFRIKAANSFAL: 'AFR-FAL',
  AFRIKAANSHL: 'AFR-HL',
  BUSINESSSTUDIES: 'BUS',
  CAT: 'CAT',
  ECONOMICS: 'ECO',
  EMS: 'EMS',
  ENGLISHFAL: 'ENG-FAL',
  ENGLISHHL: 'ENG-HL',
  GEOGRAPHY: 'GEO',
  HISTORY: 'HIS',
  IT: 'IT',
  LIFEORIENTATION: 'LO',
  LIFESCI: 'LIF',
  LIFESKILLS: 'LSK',
  MATHEMATICS: 'MAT',
  MATHLIT: 'MLIT',
  NATSCIENCES: 'NS',
  NSTECH: 'NSTECH',
  PHYSSCI: 'PHY',
  SOCIALSCIENCES: 'SS',
  TECHNOLOGY: 'TECH',
  TOURISM: 'TOU',
  VISUALARTS: 'ART',
};

export function normalizeMatchText(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function titleCaseCode(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function inferTerm(node: CurriculumNodeItem): number | null {
  const source = `${node.code} ${node.title}`;
  const match = source.match(/(?:^|[-\s])T(?:ERM)?\s*(\d)(?:$|[-\s])/i)
    ?? source.match(/\bterm\s*(\d)\b/i);
  if (!match) return null;
  const term = Number(match[1]);
  return term >= 1 && term <= 4 ? term : null;
}

function parseGradeLevelFromText(text: string): number | null {
  const m = text.match(/\bGR(?:ADE)?\s*0?(\d{1,2})\b/i) ?? text.match(/\bgrade\s*0?(\d{1,2})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 12 ? n : null;
}

function deriveSubjectCodeFromName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

/**
 * Build a generation context from a leaf node.
 *
 * Strategy, in order:
 *   1. **Ancestors** (preferred): find the `subject` and `grade` nodes in the
 *      ancestor chain and read their titles directly. Use `node.termNumber`
 *      (denormalized) for term. This is reliable regardless of the leaf
 *      node's own code format.
 *   2. **Regex on the leaf node's `code`** (legacy fallback): requires the
 *      CAPS-XXX-GR10-T1 convention. Many imported nodes don't follow this,
 *      so we only fall back when no ancestors are supplied.
 *
 * The tree browser passes ancestors via its `ctx` callback param.
 * Search-based pickers (NodePicker) currently don't — callers should
 * `resolveAncestors(node)` before invoking this function for that path.
 */
export function extractCurriculumContext(
  node: CurriculumNodeItem,
  ancestors?: CurriculumNodeItem[],
): CurriculumGenerationContext | null {
  // ── Strategy 1: ancestors + denormalized termNumber ────────────────────
  if (ancestors && ancestors.length > 0) {
    const subjectNode = ancestors.find((a) => a.type === 'subject');
    const gradeNode = ancestors.find((a) => a.type === 'grade');
    const term = node.termNumber ?? inferTerm(node)
      ?? (ancestors.map((a) => a.termNumber).find((t): t is number => typeof t === 'number') ?? null);

    if (subjectNode && gradeNode && term) {
      const subjectName = subjectNode.title.trim();
      const subjectCode = deriveSubjectCodeFromName(subjectName);
      const gradeLevelValue = parseGradeLevelFromText(gradeNode.title)
        ?? parseGradeLevelFromText(gradeNode.code);
      if (subjectCode && gradeLevelValue !== null) {
        return {
          subjectCode,
          subjectName: CAPS_SUBJECT_NAMES[subjectCode] ?? subjectName,
          gradeLevel: gradeLevelValue,
          gradeName: gradeNode.title.trim() || `Grade ${gradeLevelValue}`,
          term,
        };
      }
    }
  }

  // ── Strategy 2: legacy regex on the leaf node's code ───────────────────
  const source = `${node.code} ${node.title}`;
  const gradeMatch = source.match(/\bGR(?:ADE)?\s*0?(\d{1,2})\b/i)
    ?? source.match(/\bgrade\s*0?(\d{1,2})\b/i);
  const subjectMatch = node.code.match(/^CAPS-(.+?)-GR\d{1,2}(?:-|$)/i);
  const term = node.termNumber ?? inferTerm(node);

  if (!gradeMatch || !subjectMatch || !term) return null;

  const subjectCode = subjectMatch[1].replace(/[^a-z0-9]/gi, '').toUpperCase();
  const gradeLevelValue = Number(gradeMatch[1]);
  if (!subjectCode || !Number.isFinite(gradeLevelValue)) return null;

  return {
    subjectCode,
    subjectName: CAPS_SUBJECT_NAMES[subjectCode] ?? titleCaseCode(subjectMatch[1]),
    gradeLevel: gradeLevelValue,
    gradeName: `Grade ${gradeLevelValue}`,
    term,
  };
}

export function contextsMatch(a: CurriculumGenerationContext, b: CurriculumGenerationContext): boolean {
  return a.subjectCode === b.subjectCode
    && a.gradeLevel === b.gradeLevel
    && a.term === b.term;
}

export function academicSubjectCode(context: CurriculumGenerationContext): string {
  return ACADEMIC_SUBJECT_CODES[context.subjectCode]
    ?? context.subjectCode.slice(0, 8)
    ?? normalizeMatchText(context.subjectName).slice(0, 8).toUpperCase();
}

export function gradeLevel(grade: AcademicGradeRecord): number | null {
  if (typeof grade.level === 'number') return grade.level;
  if (typeof grade.orderIndex === 'number') return grade.orderIndex;
  const match = grade.name.match(/\b(?:Grade\s*)?0?(\d{1,2})\b/i);
  return match ? Number(match[1]) : null;
}

export function findMatchingGrade(
  grades: Grade[],
  context: CurriculumGenerationContext,
): AcademicGradeRecord | undefined {
  return (grades as AcademicGradeRecord[]).find((grade) => (
    gradeLevel(grade) === context.gradeLevel
    || normalizeMatchText(grade.name) === normalizeMatchText(context.gradeName)
  ));
}

export function findMatchingSubject(
  subjects: Subject[],
  context: CurriculumGenerationContext,
): AcademicSubjectRecord | undefined {
  const code = academicSubjectCode(context);
  return (subjects as AcademicSubjectRecord[]).find((subject) => {
    const subjectName = normalizeMatchText(subject.name);
    const subjectCode = normalizeMatchText(subject.code);
    return subjectName === normalizeMatchText(context.subjectName)
      || subjectCode === normalizeMatchText(code)
      || subjectCode === normalizeMatchText(context.subjectCode);
  });
}

export function subjectGradeIds(subject: AcademicSubjectRecord): string[] {
  return (subject.gradeIds ?? []).map((gradeRef) => resolveId(gradeRef)).filter(Boolean);
}

