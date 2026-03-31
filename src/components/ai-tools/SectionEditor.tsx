'use client';

import { Badge } from '@/components/ui/badge';
import { QuestionCard } from './QuestionCard';
import type { PaperSection } from './types';

interface SectionEditorProps {
  section: PaperSection;
  sectionIndex: number;
  regeneratingKey: string | null;
  showModelAnswers?: boolean;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
}

export function SectionEditor({
  section,
  sectionIndex,
  regeneratingKey,
  showModelAnswers = false,
  onEditQuestion,
  onRegenerateQuestion,
}: SectionEditorProps) {
  const sectionMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {section.sectionLabel}: {section.questionType}
        </h3>
        <Badge variant="outline">{sectionMarks} marks</Badge>
      </div>
      {section.questions.map((question, qIdx) => (
        <QuestionCard
          key={`${sectionIndex}-${qIdx}`}
          question={question}
          sectionIndex={sectionIndex}
          questionIndex={qIdx}
          regeneratingKey={regeneratingKey}
          onEdit={onEditQuestion}
          onRegenerate={onRegenerateQuestion}
          showModelAnswer={showModelAnswers}
        />
      ))}
    </div>
  );
}
