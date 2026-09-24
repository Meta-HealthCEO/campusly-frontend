'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHomeworkAIDraft } from '@/hooks/useHomeworkAIDraft';
import { DraftQuestionItem } from '@/components/homework/DraftQuestionItem';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import {
  DRAFT_LEVEL_LABELS,
  DRAFT_TYPE_LABELS,
  draftRequest,
  keptSummary,
  type DraftLevel,
  type DraftQuestion,
  type DraftQuestionType,
  type DraftScope,
} from '@/lib/homework-ai-draft';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: DraftScope;
  /** Called with the ids of the questions the teacher kept (now approved in the bank). */
  onAdded: (ids: string[]) => void;
}

const COUNTS = [3, 5, 8, 10];

/** Choose what to draft, let AI write it, keep the good ones. */
export function DraftHomeworkWithAIDialog({ open, onOpenChange, scope, onAdded }: Props) {
  const { drafting, drafts, failure, draft, keep, reset } = useHomeworkAIDraft();
  const [type, setType] = useState<DraftQuestionType>('short_answer');
  const [count, setCount] = useState(5);
  const [level, setLevel] = useState<DraftLevel>('standard');
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const chosen = drafts.filter((d: DraftQuestion) => !unticked.has(d.id));

  const close = (next: boolean): void => {
    if (!next) {
      reset();
      setUnticked(new Set());
      setSaveNote(null);
    }
    onOpenChange(next);
  };

  const toggle = (id: string): void => {
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = async (): Promise<void> => {
    setAdding(true);
    const { keptIds, failed } = await keep(chosen.map((d: DraftQuestion) => d.id));
    setAdding(false);
    if (keptIds.length > 0) onAdded(keptIds);
    if (failed > 0) {
      // Keep the dialog open with the ones that didn't save, so nothing the teacher chose is lost.
      setSaveNote(`${keptSummary(keptIds.length, failed)} They're still below: add them again.`);
      return;
    }
    toast.success(keptSummary(keptIds.length, 0));
    close(false);
  };

  const run = (): void => { void draft(draftRequest(scope, { type, count, level })); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft questions with AI</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {drafts.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="draft-type">Kind of question</Label>
                <Select value={type} onValueChange={(v: unknown) => setType(v as DraftQuestionType)}>
                  <SelectTrigger id="draft-type" className="w-full"><SelectValue>{DRAFT_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DRAFT_TYPE_LABELS) as DraftQuestionType[]).map((t) => <SelectItem key={t} value={t}>{DRAFT_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="draft-count">How many</Label>
                <Select value={String(count)} onValueChange={(v: unknown) => setCount(Number(v))}>
                  <SelectTrigger id="draft-count" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="draft-level">Level</Label>
                <Select value={level} onValueChange={(v: unknown) => setLevel(v as DraftLevel)}>
                  <SelectTrigger id="draft-level" className="w-full"><SelectValue>{DRAFT_LEVEL_LABELS[level]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DRAFT_LEVEL_LABELS) as DraftLevel[]).map((l) => <SelectItem key={l} value={l}>{DRAFT_LEVEL_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {drafts.map((d: DraftQuestion, i: number) => (
                <DraftQuestionItem key={d.id} question={d} index={i} checked={!unticked.has(d.id)} onToggle={() => toggle(d.id)} />
              ))}
            </ul>
          )}
          {drafting ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Writing questions for this topic…
            </p>
          ) : null}
          {failure ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{failure.message}</div>
          ) : null}
          {saveNote ? (
            <div role="alert" className="rounded-lg border border-attention/30 bg-attention-soft px-3 py-2 text-sm text-attention">{saveNote}</div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} className="min-h-11 sm:min-h-9">Cancel</Button>
          {drafts.length === 0 && failure?.upgrade ? (
            <Button onClick={() => setUpgradeOpen(true)} className="min-h-11 sm:min-h-9">Start a free trial</Button>
          ) : drafts.length === 0 && (!failure || failure.retryable) ? (
            <Button onClick={run} disabled={drafting} className="min-h-11 gap-1.5 sm:min-h-9">
              <Sparkles className="h-4 w-4" aria-hidden /> {failure ? 'Try again' : 'Draft questions'}
            </Button>
          ) : drafts.length === 0 ? null : (
            <Button onClick={() => void add()} disabled={adding || chosen.length === 0} className="min-h-11 sm:min-h-9">
              {adding ? 'Adding…' : `Add ${chosen.length} to homework`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="aiGeneration" />
    </Dialog>
  );
}
