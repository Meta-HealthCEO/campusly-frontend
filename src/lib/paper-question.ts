import type {
  PaperQuestion,
  PaperQuestionOption,
  PopulatedPaperQuestionRef,
} from '@/types/papers';

function populatedQuestionRef(
  question: PaperQuestion,
): PopulatedPaperQuestionRef | null {
  if (!question.questionId || typeof question.questionId === 'string') {
    return null;
  }
  return question.questionId;
}

export function getPaperQuestionText(question: PaperQuestion): string {
  const inlineText = question.questionText?.trim();
  if (inlineText) return inlineText;
  return populatedQuestionRef(question)?.stem?.trim() ?? '';
}

export function getPaperQuestionAnswer(question: PaperQuestion): string {
  const inlineAnswer = question.modelAnswer?.trim();
  if (inlineAnswer) return inlineAnswer;
  return populatedQuestionRef(question)?.answer?.trim() ?? '';
}

export function getPaperQuestionGuideline(question: PaperQuestion): string {
  const inlineGuideline = question.markingGuideline?.trim();
  if (inlineGuideline) return inlineGuideline;
  return populatedQuestionRef(question)?.markingRubric?.trim() ?? '';
}

export function getPaperQuestionType(question: PaperQuestion): string {
  return populatedQuestionRef(question)?.type ?? '';
}

export function getPaperQuestionOptions(question: PaperQuestion): PaperQuestionOption[] {
  const snapshotOptions = question.options ?? [];
  const options = snapshotOptions.length > 0
    ? snapshotOptions
    : populatedQuestionRef(question)?.options ?? [];
  return options.filter((option) => option.label?.trim() && option.text?.trim());
}
