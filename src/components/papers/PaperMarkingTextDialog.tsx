'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MarkingTextEntry, type DigitalAnswer } from '@/components/ai-tools/MarkingTextEntry';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  classId: string;
  studentId: string;
  studentName: string;
  onMarked: () => void;
}

export function PaperMarkingTextDialog({
  open, onOpenChange, paperId, classId, studentId, studentName, onMarked,
}: Props) {
  const { markPaperFromText, loading } = useTeacherMarking();

  const handleSubmit = async (answers: DigitalAnswer[]) => {
    const result = await markPaperFromText(
      paperId,
      'assessment',
      studentName,
      answers,
      { studentId, classId },
    );
    if (result) {
      onOpenChange(false);
      onMarked();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Type answers — {studentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Paste or type each answer. AI grades against the memo.
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <MarkingTextEntry
            paperId={paperId}
            onSubmit={(answers) => void handleSubmit(answers)}
            onBack={() => onOpenChange(false)}
            isLoading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
