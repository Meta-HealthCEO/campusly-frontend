'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuestionBankLibrary } from '@/hooks/useQuestionBankLibrary';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  paperId: string;
  sectionIdx: number;
  subjectId: string;
  gradeId: string;
  onAdded: () => void | Promise<void>;
}

export function QuestionBankPicker({
  paperId,
  sectionIdx,
  subjectId,
  gradeId,
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [marks, setMarks] = useState(2);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customModelAnswer, setCustomModelAnswer] = useState('');
  const [customMarkingGuideline, setCustomMarkingGuideline] = useState('');
  const [busy, setBusy] = useState(false);

  const { questions, loading } = useQuestionBankLibrary({
    subjectId,
    gradeId,
    q: search,
  });
  const { addQuestion } = useTeacherPapers(false);

  const handleAdd = async (questionId: string): Promise<void> => {
    setBusy(true);
    try {
      const result = await addQuestion(paperId, sectionIdx, {
        questionId,
        marks,
        position: 0,
      });
      if (result) {
        await onAdded();
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddCustom = async (): Promise<void> => {
    if (!customQuestionText.trim()) return;
    setBusy(true);
    try {
      const result = await addQuestion(paperId, sectionIdx, {
        questionText: customQuestionText.trim(),
        marks,
        position: 0,
        modelAnswer: customModelAnswer.trim(),
        markingGuideline: customMarkingGuideline.trim(),
      });
      if (result) {
        await onAdded();
        setCustomQuestionText('');
        setCustomModelAnswer('');
        setCustomMarkingGuideline('');
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Add from Q-bank
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add Question from Bank</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!loading && questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Question Bank is empty for this subject/grade. Questions will be
              added in Module 4. For now, use AI generation instead.
            </p>
          )}
          <div className="space-y-1">
            {questions.map((q) => (
              <div
                key={q._id}
                className="flex items-center gap-2 p-2 border rounded"
              >
                <p className="text-sm flex-1 line-clamp-2">
                  {q.stem ?? '(no text)'}
                </p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className="w-16"
                />
                <Button
                  size="sm"
                  onClick={() => void handleAdd(q._id)}
                  disabled={busy}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Add Custom Question</p>
            <div className="space-y-1">
              <Label htmlFor="custom-question-text">Question</Label>
              <Textarea
                id="custom-question-text"
                value={customQuestionText}
                onChange={(e) => setCustomQuestionText(e.target.value)}
                rows={4}
                placeholder="Type the question exactly as it should appear on the paper."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[96px_1fr]">
              <div className="space-y-1">
                <Label htmlFor="custom-question-marks">Marks</Label>
                <Input
                  id="custom-question-marks"
                  type="number"
                  min={1}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-question-answer">Model Answer</Label>
                <Input
                  id="custom-question-answer"
                  value={customModelAnswer}
                  onChange={(e) => setCustomModelAnswer(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom-question-guideline">Marking Guideline</Label>
              <Textarea
                id="custom-question-guideline"
                value={customMarkingGuideline}
                onChange={(e) => setCustomMarkingGuideline(e.target.value)}
                rows={2}
                placeholder="Optional"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleAddCustom()}
              disabled={busy || !customQuestionText.trim() || marks < 1}
            >
              Add Custom Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
