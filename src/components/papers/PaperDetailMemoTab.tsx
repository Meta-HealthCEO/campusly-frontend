'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type {
  Paper,
  PaperMemo,
  MemoSection,
  MemoAnswer,
  MarkAllocation,
  PaperQuestion,
} from '@/types/papers';

interface Props {
  paper: Paper;
  memo: PaperMemo;
  onChanged: () => Promise<void>;
}

interface AnswerCardProps {
  ans: MemoAnswer;
  paperQ: PaperQuestion | undefined;
  isFinalised: boolean;
  onPatchAnswer: (patch: Partial<MemoAnswer>) => void;
  onPatchAllocation: (mIdx: number, patch: Partial<MarkAllocation>) => void;
  onAddAllocation: () => void;
  onRemoveAllocation: (mIdx: number) => void;
}

function MemoAnswerCard({
  ans,
  paperQ,
  isFinalised,
  onPatchAnswer,
  onPatchAllocation,
  onAddAllocation,
  onRemoveAllocation,
}: AnswerCardProps) {
  const allocationTotal = ans.markAllocation.reduce(
    (s: number, m: MarkAllocation) => s + m.marks,
    0,
  );
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium">{ans.questionNumber}</p>
        {paperQ?.questionText && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            {paperQ.questionText}
          </p>
        )}

        <div className="space-y-1">
          <Label>Expected Answer</Label>
          <Textarea
            value={ans.expectedAnswer}
            onChange={(e) => onPatchAnswer({ expectedAnswer: e.target.value })}
            rows={3}
            disabled={isFinalised}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Mark Allocation</Label>
            {!isFinalised && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onAddAllocation}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            )}
          </div>
          {ans.markAllocation.map((m: MarkAllocation, mIdx: number) => (
            <div key={mIdx} className="flex gap-2 items-start">
              <Input
                value={m.criterion}
                onChange={(e) =>
                  onPatchAllocation(mIdx, { criterion: e.target.value })
                }
                placeholder="Criterion"
                className="flex-1"
                disabled={isFinalised}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={m.marks}
                onChange={(e) =>
                  onPatchAllocation(mIdx, { marks: Number(e.target.value) })
                }
                placeholder="Marks"
                className="w-20"
                disabled={isFinalised}
              />
              {!isFinalised && ans.markAllocation.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveAllocation(mIdx)}
                  aria-label="Remove criterion"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Total: {allocationTotal} marks
          </p>
        </div>

        <div className="space-y-1">
          <Label>Common Mistakes (optional)</Label>
          <Textarea
            value={(ans.commonMistakes ?? []).join('\n')}
            onChange={(e) =>
              onPatchAnswer({
                commonMistakes: e.target.value
                  .split('\n')
                  .map((s) => s)
                  .filter((s) => s.length > 0),
              })
            }
            placeholder="One per line"
            rows={2}
            disabled={isFinalised}
          />
        </div>

        <div className="space-y-1">
          <Label>Acceptable Alternatives (optional)</Label>
          <Textarea
            value={(ans.acceptableAlternatives ?? []).join('\n')}
            onChange={(e) =>
              onPatchAnswer({
                acceptableAlternatives: e.target.value
                  .split('\n')
                  .map((s) => s)
                  .filter((s) => s.length > 0),
              })
            }
            placeholder="One per line"
            rows={2}
            disabled={isFinalised}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PaperDetailMemoTab({ paper, memo, onChanged }: Props) {
  const { updateMemo } = useTeacherPapers();
  const [sections, setSections] = useState<MemoSection[]>(memo.sections);
  const [saving, setSaving] = useState(false);

  const isFinalised = paper.status === 'finalised';

  const updateAnswer = (
    sIdx: number,
    aIdx: number,
    patch: Partial<MemoAnswer>,
  ): void => {
    setSections((prev: MemoSection[]) =>
      prev.map((s: MemoSection, si: number) =>
        si !== sIdx
          ? s
          : {
              ...s,
              answers: s.answers.map((ans: MemoAnswer, ai: number) =>
                ai !== aIdx ? ans : { ...ans, ...patch },
              ),
            },
      ),
    );
  };

  const updateAllocation = (
    sIdx: number,
    aIdx: number,
    mIdx: number,
    patch: Partial<MarkAllocation>,
  ): void => {
    const ans = sections[sIdx].answers[aIdx];
    const newAlloc = ans.markAllocation.map(
      (m: MarkAllocation, mi: number) => (mi !== mIdx ? m : { ...m, ...patch }),
    );
    updateAnswer(sIdx, aIdx, { markAllocation: newAlloc });
  };

  const addAllocation = (sIdx: number, aIdx: number): void => {
    const ans = sections[sIdx].answers[aIdx];
    updateAnswer(sIdx, aIdx, {
      markAllocation: [...ans.markAllocation, { criterion: '', marks: 0 }],
    });
  };

  const removeAllocation = (
    sIdx: number,
    aIdx: number,
    mIdx: number,
  ): void => {
    const ans = sections[sIdx].answers[aIdx];
    updateAnswer(sIdx, aIdx, {
      markAllocation: ans.markAllocation.filter(
        (_: MarkAllocation, mi: number) => mi !== mIdx,
      ),
    });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const ok = await updateMemo(paper._id, sections);
      if (ok) await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const findPaperQ = (
    sIdx: number,
    questionNumber: string,
  ): PaperQuestion | undefined => {
    return paper.sections[sIdx]?.questions.find((q: PaperQuestion) => {
      const qNum = `${sIdx + 1}.${q.position + 1}`;
      return qNum === questionNumber;
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((section: MemoSection, sIdx: number) => (
        <div key={sIdx} className="space-y-3">
          <h3 className="font-semibold text-lg">{section.sectionTitle}</h3>
          {section.answers.map((ans: MemoAnswer, aIdx: number) => (
            <MemoAnswerCard
              key={`${sIdx}-${aIdx}`}
              ans={ans}
              paperQ={findPaperQ(sIdx, ans.questionNumber)}
              isFinalised={isFinalised}
              onPatchAnswer={(patch) => updateAnswer(sIdx, aIdx, patch)}
              onPatchAllocation={(mIdx, patch) =>
                updateAllocation(sIdx, aIdx, mIdx, patch)
              }
              onAddAllocation={() => addAllocation(sIdx, aIdx)}
              onRemoveAllocation={(mIdx) => removeAllocation(sIdx, aIdx, mIdx)}
            />
          ))}
        </div>
      ))}

      {!isFinalised && (
        <div className="sticky bottom-0 bg-background border-t pt-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Memo'}
          </Button>
        </div>
      )}
    </div>
  );
}
