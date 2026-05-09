'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionItem, QuestionType } from '@/types/question-bank';

interface Props {
  question: Pick<QuestionItem, 'type' | 'options' | 'stem' | 'id'>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ExerciseQuestionRenderer({ question, value, onChange, disabled }: Props) {
  const radioGroupName = `q-${question.id}`;

  switch (question.type as QuestionType) {
    case 'mcq':
      return (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={radioGroupName}
                checked={value === opt.label}
                onChange={() => onChange(opt.label)}
                disabled={disabled}
                className="mt-0.5 shrink-0"
              />
              <span>
                <span className="font-medium">{opt.label}.</span> {opt.text}
              </span>
            </label>
          ))}
        </div>
      );

    case 'true_false':
      return (
        <div className="flex gap-4">
          {(['true', 'false'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
              <input
                type="radio"
                name={radioGroupName}
                checked={value === v}
                onChange={() => onChange(v)}
                disabled={disabled}
              />
              {v}
            </label>
          ))}
        </div>
      );

    case 'short_answer':
    case 'fill_blank':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
        />
      );

    case 'calculation':
    case 'essay':
    case 'case_study':
    case 'diagram_label':
    case 'structured':
    case 'match':
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
          rows={4}
        />
      );

    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
        />
      );
  }
}
