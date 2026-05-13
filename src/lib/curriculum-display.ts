import type { CurriculumNodeItem } from '@/types';
import { CAPS_SUBJECT_NAMES, titleCaseCode } from '@/hooks/useCurriculumPreparation';

// Phase code suffixes → human label. The CAPS framework groups grades into
// these four phases; codes are usually a short abbreviation.
const PHASE_LABELS: Record<string, string> = {
  FP: 'Foundation Phase',
  IP: 'Intermediate Phase',
  SP: 'Senior Phase',
  FET: 'FET Phase',
};

/**
 * A title is "code-shaped" when it looks like an identifier rather than a
 * sentence — all uppercase, contains hyphens/digits, and no whitespace.
 * E.g. "CAPS-MATHEMATICS-GR1-T1" qualifies; "Functions and graphs" does not.
 */
function looksLikeCode(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  if (/\s/.test(trimmed)) return false;
  return /^[A-Z0-9][A-Z0-9_\-]*$/i.test(trimmed) && (/[-_]/.test(trimmed) || /^CAPS/i.test(trimmed));
}

function parseGradeNumber(text: string): number | null {
  const m = text.match(/\bGR(?:ADE)?\s*0?(\d{1,2})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 12 ? n : null;
}

function parsePhaseLabel(text: string): string | null {
  const m = text.match(/CAPS-(FP|IP|SP|FET)(?:$|-)/i);
  if (!m) return null;
  return PHASE_LABELS[m[1].toUpperCase()] ?? null;
}

function parseSubjectName(text: string): string | null {
  // "CAPS-<SUBJECT>-GR<n>" — pull the subject token.
  const m = text.match(/^CAPS-([A-Z0-9]+)(?:-GR\d+)?/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return CAPS_SUBJECT_NAMES[code] ?? titleCaseCode(code);
}

function parseTermNumber(text: string): number | null {
  const m = text.match(/[-_]T(?:ERM)?\s*0?(\d)(?:$|[-_])/i) ?? text.match(/\bterm\s*0?(\d)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 4 ? n : null;
}

/**
 * Returns a human-friendly display title for a curriculum node. When the
 * stored `title` is already readable (contains whitespace or isn't code-shaped)
 * it's returned as-is. Otherwise we derive a label from the node `type` plus
 * data parsed out of the title/code.
 *
 * This is purely cosmetic. The underlying data isn't modified, and downstream
 * consumers (curriculum-context extraction, AI prompts, etc.) still see the
 * original `title` field.
 */
export function displayNodeTitle(node: CurriculumNodeItem): string {
  const title = (node.title ?? '').trim();
  if (title && !looksLikeCode(title)) return title;

  const source = `${node.code ?? ''} ${title}`.trim();

  switch (node.type) {
    case 'phase': {
      const label = parsePhaseLabel(source);
      if (label) return label;
      break;
    }
    case 'grade': {
      const n = parseGradeNumber(source);
      if (n !== null) return `Grade ${n}`;
      break;
    }
    case 'subject': {
      const name = parseSubjectName(source);
      if (name) return name;
      break;
    }
    case 'term': {
      const n = node.termNumber ?? parseTermNumber(source);
      if (n) return `Term ${n}`;
      break;
    }
    default:
      break;
  }

  // Fallback: strip the CAPS- prefix and tail it with the type so the user
  // gets at least something readable instead of a raw identifier.
  const cleaned = title.replace(/^CAPS-/i, '').replace(/[-_]/g, ' ').trim();
  return cleaned || node.code || node.type;
}
