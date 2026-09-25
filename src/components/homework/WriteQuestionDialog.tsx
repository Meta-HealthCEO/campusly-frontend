'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useWriteOwnQuestion } from '@/hooks/useWriteOwnQuestion';
import { emptyOwnQuestion, ownQuestionProblem, type OwnQuestionInput, type OwnQuestionType } from '@/lib/own-question';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: { subjectId: string; gradeId: string; curriculumNodeId: string };
  topicName?: string;
  /** Called with the new question's id (saved to the teacher's bank). */
  onAdded: (ids: string[]) => void;
}

const TYPES: Array<{ value: OwnQuestionType; label: string }> = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'short_answer', label: 'Short answer' },
];

const letter = (i: number): string => String.fromCharCode(65 + i);

/** Write one question by hand — works with no AI actions left. Mount it only while open, so each question starts blank. */
export function WriteQuestionDialog({ open, onOpenChange, scope, topicName, onAdded }: Props) {
  const [q, setQ] = useState<OwnQuestionInput>(emptyOwnQuestion());
  const [tried, setTried] = useState(false);
  const { saving, error, save } = useWriteOwnQuestion();

  const problem = ownQuestionProblem(q);
  const set = (patch: Partial<OwnQuestionInput>): void => setQ((prev: OwnQuestionInput) => ({ ...prev, ...patch }));

  const submit = async (): Promise<void> => {
    setTried(true);
    if (problem) return;
    const id = await save(q, scope);
    if (!id) return;
    onAdded([id]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write a question</DialogTitle>
          <DialogDescription>
            {topicName ? `For ${topicName}. ` : ''}It&apos;s saved to your questions, so you can use it again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          <div role="radiogroup" aria-label="Kind of question" className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={q.type === t.value}
                onClick={() => set({ type: t.value })}
                className={cn(
                  'min-h-11 rounded-lg border px-3 text-sm font-medium',
                  q.type === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="own-stem">Question <span className="text-destructive">*</span></Label>
            <Textarea id="own-stem" value={q.stem} onChange={(e) => set({ stem: e.target.value })} rows={3} />
          </div>
          {q.type === 'mcq' ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Options: mark the correct one <span className="text-destructive">*</span></legend>
              {q.options.map((text: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="own-correct"
                    aria-label={`Option ${letter(i)} is correct`}
                    checked={q.correctIndex === i}
                    onChange={() => set({ correctIndex: i })}
                    className="h-5 w-5 shrink-0 accent-primary"
                  />
                  <Input
                    aria-label={`Option ${letter(i)}`}
                    value={text}
                    onChange={(e) => set({ options: q.options.map((o: string, j: number) => (j === i ? e.target.value : o)) })}
                    className="min-h-11 w-full"
                  />
                </div>
              ))}
            </fieldset>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="own-answer">Expected answer <span className="text-destructive">*</span></Label>
              <Textarea id="own-answer" value={q.answer} onChange={(e) => set({ answer: e.target.value })} rows={2} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="own-marks">Marks</Label>
            <Input
              id="own-marks"
              type="number"
              min={1}
              max={100}
              value={q.marks}
              onChange={(e) => set({ marks: Number(e.target.value) })}
              className="min-h-11 w-full sm:w-28"
            />
          </div>
          {tried && problem ? <p className="text-sm text-destructive">{problem}</p> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving} className="min-h-11 gap-1.5 sm:min-h-9">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Save and add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
