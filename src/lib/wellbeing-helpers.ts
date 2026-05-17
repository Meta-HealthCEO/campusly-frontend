import type {
  SurveyQuestion,
  SurveyStatus,
  WellbeingQuestionType,
  WellbeingSurvey,
} from '@/types';

const QUESTION_TYPES: WellbeingQuestionType[] = ['scale', 'multiple_choice', 'text', 'yes_no'];
const SURVEY_STATUSES: SurveyStatus[] = ['draft', 'active', 'closed'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return '';
}

function readId(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return readString(record._id) || readString(record.id);
}

function normalizeQuestion(raw: unknown): SurveyQuestion | null {
  const question = asRecord(raw);
  const type = readString(question.type) as WellbeingQuestionType;
  if (!QUESTION_TYPES.includes(type)) return null;

  return {
    text: readString(question.text),
    type,
    scaleMin: typeof question.scaleMin === 'number' ? question.scaleMin : undefined,
    scaleMax: typeof question.scaleMax === 'number' ? question.scaleMax : undefined,
    scaleLabels: asRecord(question.scaleLabels) as Record<string, string>,
    options: Array.isArray(question.options)
      ? question.options.filter((option): option is string => typeof option === 'string')
      : undefined,
    required: typeof question.required === 'boolean' ? question.required : true,
  };
}

export function normalizeWellbeingSurvey(raw: unknown): WellbeingSurvey | null {
  const survey = asRecord(raw);
  const id = readId(survey.id) || readId(survey._id);
  const title = readString(survey.title);
  if (!id || !title) return null;

  const status = readString(survey.status) as SurveyStatus;

  return {
    id,
    schoolId: readId(survey.schoolId),
    title,
    description: readString(survey.description) || undefined,
    isAnonymous: typeof survey.isAnonymous === 'boolean' ? survey.isAnonymous : true,
    targetGrades: Array.isArray(survey.targetGrades)
      ? survey.targetGrades.map(Number).filter((grade) => Number.isFinite(grade))
      : [],
    status: SURVEY_STATUSES.includes(status) ? status : 'draft',
    startDate: readString(survey.startDate),
    endDate: readString(survey.endDate),
    questions: Array.isArray(survey.questions)
      ? survey.questions.map(normalizeQuestion).filter((q): q is SurveyQuestion => q !== null)
      : [],
    createdBy: asRecord(survey.createdBy) as WellbeingSurvey['createdBy'],
    responseCount: typeof survey.responseCount === 'number' ? survey.responseCount : undefined,
    createdAt: readString(survey.createdAt),
    updatedAt: readString(survey.updatedAt),
  };
}
