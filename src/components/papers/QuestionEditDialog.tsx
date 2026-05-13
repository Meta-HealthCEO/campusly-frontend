'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getPaperQuestionAnswer,
  getPaperQuestionGuideline,
  getPaperQuestionOptions,
  getPaperQuestionText,
  getPaperQuestionType,
} from '@/lib/paper-question';
import type { PaperQuestion } from '@/types/papers';

interface Props {
  paperId: string;
  sectionIdx: number;
  question: PaperQuestion;
  open: boolean;
  onClose: () => void | Promise<void>;
}

export function QuestionEditDialog({
  paperId,
  sectionIdx,
  question,
  open,
  onClose,
}: Props) {
  const { updateQuestion } = useTeacherPapers(false);
  const [questionText, setQuestionText] = useState<string>(
    getPaperQuestionText(question),
  );
  const [marks, setMarks] = useState<number>(question.marks);
  const [modelAnswer, setModelAnswer] = useState<string>(
    getPaperQuestionAnswer(question),
  );
  const [markingGuideline, setMarkingGuideline] = useState<string>(
    getPaperQuestionGuideline(question),
  );
  const options = getPaperQuestionOptions(question);
  const questionType = getPaperQuestionType(question);
  const [saving, setSaving] = useState(false);
  const isInlineQuestion = question.questionId === null;
  const canSave = marks > 0 && (!isInlineQuestion || questionText.trim().length > 0);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const patch: {
        questionText?: string;
        marks: number;
        modelAnswer?: string;
        markingGuideline?: string;
      } = {
        marks,
        modelAnswer: modelAnswer.trim(),
        markingGuideline: markingGuideline.trim(),
      };
      if (questionText.trim() || isInlineQuestion) {
        patch.questionText = questionText.trim();
      }
      await updateQuestion(paperId, sectionIdx, question.position, {
        ...patch,
      });
      await onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) void onClose();
      }}
    >
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Question {sectionIdx + 1}.{question.position + 1}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          <div className="space-y-1">
            <Label htmlFor="qe-text">Question Text</Label>
            <Textarea
              id="qe-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe-marks">Marks</Label>
            <Input
              id="qe-marks"
              type="number"
              min={0}
              max={100}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              className="w-full sm:w-32"
            />
          </div>
          {options.length > 0 && (
            <div className="space-y-2">
              <Label>
                {questionType === 'true_false' ? 'Answer Options' : 'Multiple Choice Options'}
              </Label>
              <div className="space-y-2">
                {options.map((option) => (
                  <div
                    key={`${option.label}-${option.text}`}
                    className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{option.label}.</span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                      {option.text}
                    </span>
                    {option.isCorrect && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="qe-model">Model Answer</Label>
            <Textarea
              id="qe-model"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe-guide">Marking Guideline (optional)</Label>
            <Textarea
              id="qe-guide"
              value={markingGuideline}
              onChange={(e) => setMarkingGuideline(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-3 border-t sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => void onClose()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
