'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QuestionCard } from './QuestionCard';
import type { PaperSection } from './types';

interface SectionEditorProps {
  section: PaperSection;
  sectionIndex: number;
  regeneratingKey: string | null;
  editedKeys: Set<string>;
  showModelAnswers?: boolean;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
}

export function SectionEditor({
  section,
  sectionIndex,
  regeneratingKey,
  editedKeys,
  showModelAnswers = false,
  onEditQuestion,
  onRegenerateQuestion,
}: SectionEditorProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const sectionMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);

  const requestRegenerate = (sectionIdx: number, qIdx: number) => {
    const key = `${sectionIdx}:${qIdx}`;
    if (editedKeys.has(key)) {
      setPendingKey(key);
    } else {
      onRegenerateQuestion(sectionIdx, qIdx);
    }
  };

  const confirmRegenerate = () => {
    if (!pendingKey) return;
    const [sectionIdxStr, qIdxStr] = pendingKey.split(':');
    setPendingKey(null);
    onRegenerateQuestion(Number(sectionIdxStr), Number(qIdxStr));
  };

  return (
    <>
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
            isEdited={editedKeys.has(`${sectionIndex}:${qIdx}`)}
            onEdit={onEditQuestion}
            onRegenerate={requestRegenerate}
            showModelAnswer={showModelAnswers}
          />
        ))}
      </div>

      <Dialog open={pendingKey !== null} onOpenChange={(open) => { if (!open) setPendingKey(null); }}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Replace your edits?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              You&apos;ve made changes to this question. Regenerating will replace your edits with a
              new AI-generated version. This can&apos;t be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingKey(null)}>
              Keep my edits
            </Button>
            <Button variant="destructive" onClick={confirmRegenerate}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
