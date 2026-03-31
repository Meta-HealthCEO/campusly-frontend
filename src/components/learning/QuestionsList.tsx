'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { QuizQuestion, QuizOption } from './types';

interface QuestionsListProps {
  questions: QuizQuestion[];
  onUpdate: (idx: number, patch: Partial<QuizQuestion>) => void;
  onUpdateOption: (qIdx: number, oIdx: number, patch: Partial<QuizOption>) => void;
  onSetCorrect: (qIdx: number, oIdx: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onAddOption: (qIdx: number) => void;
  onRemoveOption: (qIdx: number, oIdx: number) => void;
}

export function QuestionsList({
  questions, onUpdate, onUpdateOption, onSetCorrect,
  onAdd, onRemove, onAddOption, onRemoveOption,
}: QuestionsListProps) {
  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Question {qi + 1}</h4>
            {questions.length > 1 && (
              <Button size="xs" variant="outline" className="text-destructive" onClick={() => onRemove(qi)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              value={q.questionText}
              onChange={(e) => onUpdate(qi, { questionText: e.target.value })}
              placeholder="Question text..."
            />
            <Select value={q.questionType} onValueChange={(v: unknown) => onUpdate(qi, { questionType: v as QuizQuestion['questionType'] })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="w-20"
              value={q.points}
              onChange={(e) => onUpdate(qi, { points: Number(e.target.value) || 1 })}
              min={1}
            />
          </div>
          {q.questionType === 'short_answer' ? (
            <Input
              value={q.correctAnswer}
              onChange={(e) => onUpdate(qi, { correctAnswer: e.target.value })}
              placeholder="Correct answer text..."
            />
          ) : (
            <div className="space-y-2">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={o.isCorrect}
                    onChange={() => onSetCorrect(qi, oi)}
                    className="h-4 w-4"
                  />
                  <Input
                    className="flex-1"
                    value={o.text}
                    onChange={(e) => onUpdateOption(qi, oi, { text: e.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  />
                  {q.options.length > 2 && (
                    <Button size="xs" variant="outline" onClick={() => onRemoveOption(qi, oi)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="xs" variant="outline" onClick={() => onAddOption(qi)}>
                <Plus className="mr-1 h-3 w-3" /> Add Option
              </Button>
            </div>
          )}
          <Input
            value={q.explanation ?? ''}
            onChange={(e) => onUpdate(qi, { explanation: e.target.value })}
            placeholder="Explanation (optional)"
          />
        </div>
      ))}
      <Button variant="outline" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" /> Add Question
      </Button>
    </div>
  );
}
