'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Pencil, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { QuestionEditDialog } from './QuestionEditDialog';
import { QuestionBankPicker } from './QuestionBankPicker';
import { getPaperQuestionOptions, getPaperQuestionText } from '@/lib/paper-question';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { Paper, PaperQuestion, PopulatedPaperQuestionRef } from '@/types/papers';

interface Props {
  paper: Paper;
  onChanged: () => Promise<void>;
}

interface EditingState {
  sectionIdx: number;
  question: PaperQuestion;
}

export function PaperDetailPaperTab({ paper, onChanged }: Props) {
  const { regenerateQuestion, deleteQuestion } = useTeacherPapers(false);
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

  // Paper-scoped commit. Works for both:
  //   - Inline questions (no Question doc yet): creates one as approved + swaps
  //     the paper's section reference to point at it.
  //   - Bank-ref drafts: flips status to approved.
  const handleSaveToBank = async (
    sectionIdx: number,
    position: number,
  ): Promise<void> => {
    setBusy(true);
    try {
      await apiClient.post(
        `/question-bank/papers/${paper._id}/sections/${sectionIdx}/questions/${position}/save-to-bank`,
      );
      toast.success('Saved to your Practice Questions bank');
      await onChanged();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not save to bank'));
    } finally {
      setBusy(false);
    }
  };

  // Determine the per-question commit state. Three possibilities:
  //   - Inline (no questionId): not in the bank — show Save button
  //   - Bank-ref with status='approved': already committed — show "In bank" badge
  //   - Bank-ref with non-approved status: draft/pending — show Save button
  function bankRefStatus(q: PaperQuestion): {
    inBank: boolean;
    canSave: boolean;
  } {
    const ref = q.questionId;
    if (!ref) return { inBank: false, canSave: true };           // inline
    if (typeof ref === 'string') return { inBank: false, canSave: true };
    const status = (ref as PopulatedPaperQuestionRef).status;
    if (status === 'approved') return { inBank: true, canSave: false };
    return { inBank: false, canSave: status !== 'rejected' };
  }

  const isFinalised = paper.status === 'finalised';
  const subjectIdStr =
    typeof paper.subjectId === 'object' ? paper.subjectId._id : paper.subjectId;
  const gradeIdStr =
    typeof paper.gradeId === 'object' ? paper.gradeId._id : paper.gradeId;

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
                : ' Add custom questions or generate them with AI.'}
            </p>
          )}

          {section.questions.map((q: PaperQuestion) => {
            const questionText = getPaperQuestionText(q);
            const options = getPaperQuestionOptions(q);
            const bankRef = bankRefStatus(q);
            return (
              <Card key={`${sIdx}-${q.position}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span>
                          {sIdx + 1}.{q.position + 1}{' '}
                          <span className="text-xs text-muted-foreground">
                            [{q.marks} marks]
                          </span>
                        </span>
                        {bankRef.inBank && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <BookmarkCheck className="h-3 w-3" />
                            In bank
                          </Badge>
                        )}
                      </p>
                      {questionText ? (
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                          {questionText}
                        </p>
                      ) : (
                        <p className="text-sm mt-1 text-destructive">
                          Question text is missing. Regenerate this question or edit it manually.
                        </p>
                      )}
                      {options.length > 0 && (
                        <div className="mt-3 grid gap-1.5">
                          {options.map((option) => (
                            <div
                              key={`${option.label}-${option.text}`}
                              className="flex gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                            >
                              <span className="font-semibold">{option.label}.</span>
                              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                                {option.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                        {bankRef.canSave && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleSaveToBank(sIdx, q.position)}
                            disabled={busy}
                            aria-label="Save to Practice Questions bank"
                            title="Save to Practice Questions bank"
                          >
                            <BookmarkPlus className="h-3 w-3" />
                          </Button>
                        )}
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
            );
          })}

          {!isFinalised && (
            <QuestionBankPicker
              paperId={paper._id}
              sectionIdx={sIdx}
              subjectId={subjectIdStr}
              gradeId={gradeIdStr}
              onAdded={onChanged}
            />
          )}
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
