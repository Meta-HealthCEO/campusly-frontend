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
  const [busy, setBusy] = useState(false);

  const { questions, loading } = useQuestionBankLibrary({
    subjectId,
    gradeId,
    q: search,
  });
  const { addQuestion } = useTeacherPapers();

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
