import { resolveId } from '@/lib/api-helpers';
import type { Assessment, PopulatedId, StudentGrade } from '@/types';

type Raw = Record<string, unknown>;

const record = (v: unknown): Raw | null => (typeof v === 'object' && v !== null ? (v as Raw) : null);
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * One row of GET /academic/marks/student/:id, as the Marks page reads it. The backend populates the assessment
 * under `assessmentId` (with its subject populated too) and names the score `mark`; the page wants `assessment`,
 * a subject id and `marks`. A row with no assessment is kept, with an empty subject, rather than crashing the page.
 */
export function gradeFromApi(raw: Raw): StudentGrade {
  const populated = record(raw.assessment) ?? record(raw.assessmentId);
  const assessment = {
    ...(populated ?? {}),
    id: str(populated?.id) || str(populated?._id),
    name: str(populated?.name),
    type: str(populated?.type),
    subjectId: resolveId(populated?.subjectId as PopulatedId),
    classId: resolveId(populated?.classId as PopulatedId) || null,
    totalMarks: num(populated?.totalMarks),
  } as Assessment;
  return {
    ...raw,
    id: str(raw.id) || str(raw._id),
    studentId: resolveId(raw.studentId as PopulatedId),
    assessmentId: assessment.id || str(raw.assessmentId),
    assessment,
    marks: num(raw.marks ?? raw.mark),
    percentage: num(raw.percentage),
  } as StudentGrade;
}
