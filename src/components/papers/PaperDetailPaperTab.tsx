'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, RefreshCw, Pencil } from 'lucide-react';
import { QuestionEditDialog } from './QuestionEditDialog';
import type { Paper, PaperQuestion } from '@/types/papers';

interface Props {
  paper: Paper;
  onChanged: () => Promise<void>;
}

interface EditingState {
  sectionIdx: number;
  question: PaperQuestion;
}

export function PaperDetailPaperTab({ paper, onChanged }: Props) {
  const { regenerateQuestion, deleteQuestion } = useTeacherPapers();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRegen = async (
    sectionIdx: number,
    position: number,
  ): Promise<void> => {
    setBusy(true);
    try {
      const result = await regenerateQuestion(paper._id, sectionIdx, position);
      if (result) await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (
    sectionIdx: number,
    position: number,
  ): Promise<void> => {
    setBusy(true);
    try {
      const ok = await deleteQuestion(paper._id, sectionIdx, position);
      if (ok) await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const isFinalised = paper.status === 'finalised';

  return (
    <div className="space-y-6">
      {paper.sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-3">
          <h3 className="font-semibold text-lg">{section.title}</h3>
          {section.instructions && (
            <p className="text-sm text-muted-foreground">
              {section.instructions}
            </p>
          )}

          {section.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No questions in this section yet.
              {paper.aiGenerated
                ? ''
                : ' Add questions from the Question Bank (empty until Module 4).'}
            </p>
          )}

          {section.questions.map((q: PaperQuestion) => (
            <Card key={`${sIdx}-${q.position}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {sIdx + 1}.{q.position + 1}{' '}
                      <span className="text-xs text-muted-foreground">
                        [{q.marks} marks]
                      </span>
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {q.questionText ?? ''}
                    </p>
                    {q.diagram?.renderStatus === 'rendered' &&
                      q.diagram.svgUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={q.diagram.svgUrl}
                          alt={q.diagram.caption ?? ''}
                          className="max-w-md w-full mt-2 border rounded"
                        />
                      )}
                    {q.diagram?.renderStatus === 'failed' && (
                      <p className="text-xs text-destructive mt-1">
                        [Diagram render failed]
                      </p>
                    )}
                    {q.diagram?.renderStatus === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        [Diagram rendering...]
                      </p>
                    )}
                  </div>
                  {!isFinalised && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({ sectionIdx: sIdx, question: q })
                        }
                        disabled={busy}
                        aria-label="Edit question"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleRegen(sIdx, q.position)}
                        disabled={busy}
                        aria-label="Regenerate question"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDelete(sIdx, q.position)}
                        disabled={busy}
                        aria-label="Delete question"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {editing && (
        <QuestionEditDialog
          paperId={paper._id}
          sectionIdx={editing.sectionIdx}
          question={editing.question}
          open={!!editing}
          onClose={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}
