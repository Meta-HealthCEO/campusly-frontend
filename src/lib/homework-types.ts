/**
 * One quiz system: auto-marked questions come from the question bank. New
 * homework is an exercise (question-bank questions) or a reading; old
 * quiz-type homework still opens and marks until it moves to the bank.
 */
export const WIZARD_HOMEWORK_TYPES: Array<{ value: 'exercise' | 'reading'; label: string; description: string }> = [
  { value: 'exercise', label: 'Exercise', description: 'Questions from the question bank, marked for you' },
  { value: 'reading', label: 'Reading', description: 'Pick a content resource; AI generates comprehension questions' },
];

export const QUIZZES_MOVED = 'New quizzes are made from the question bank: set homework as an exercise, or add a quick check to a course. The quizzes below still work until they move to the question bank.';
