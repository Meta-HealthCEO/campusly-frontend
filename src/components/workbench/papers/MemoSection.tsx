'use client';

import { MemoAnswerEditor } from './MemoAnswerEditor';
import type { MemoSection as MemoSectionType, MemoAnswer } from '@/types';

interface QuestionRef {
  questionNumber: number;
  questionText: string;
}

interface MemoSectionProps {
  section: MemoSectionType;
  questions: QuestionRef[];
  onChange: (updated: MemoSectionType) => void;
  onRegenerateAnswer: (questionNumber: number) => void;
  regeneratingQuestion: number | null;
}

export function MemoSection({
  section,
  questions,
  onChange,
  onRegenerateAnswer,
  regeneratingQuestion,
}: MemoSectionProps) {
  function handleAnswerChange(index: number, updated: MemoAnswer) {
    const answers = section.answers.map((a, i) => (i === index ? updated : a));
    onChange({ ...section, answers });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold border-b pb-2">{section.sectionTitle}</h3>
      <div className="space-y-4">
        {section.answers.map((answer, i) => {
          const match = questions.find((q) => q.questionNumber === answer.questionNumber);
          return (
            <MemoAnswerEditor
              key={answer.questionNumber}
              answer={answer}
              questionText={match?.questionText ?? `Question ${answer.questionNumber}`}
              onChange={(updated) => handleAnswerChange(i, updated)}
              onRegenerate={() => onRegenerateAnswer(answer.questionNumber)}
              regenerating={regeneratingQuestion === answer.questionNumber}
            />
          );
        })}
      </div>
    </div>
  );
}
