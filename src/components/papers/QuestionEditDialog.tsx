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
  const { updateQuestion } = useTeacherPapers();
  const [questionText, setQuestionText] = useState<string>(
    question.questionText ?? '',
  );
  const [marks, setMarks] = useState<number>(question.marks);
  const [modelAnswer, setModelAnswer] = useState<string>(
    question.modelAnswer ?? '',
  );
  const [markingGuideline, setMarkingGuideline] = useState<string>(
    question.markingGuideline ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await updateQuestion(paperId, sectionIdx, question.position, {
        questionText,
        marks,
        modelAnswer,
        markingGuideline,
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
