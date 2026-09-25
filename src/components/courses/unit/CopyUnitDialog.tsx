'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TERMS, copyClassChoice, copyTitleFor, sameGradeClasses, type CopyClassOption, type CopySource } from '@/lib/unit-library';
import type { CopyUnitInput } from '@/hooks/useClassUnit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: CopySource;
  classes: CopyClassOption[];
  /** The teacher's classes are still loading. */
  classesLoading: boolean;
  copying: boolean;
  /** Why the last copy failed. */
  error: string | null;
  onCopy: (input: CopyUnitInput) => void;
}

/** Copy a unit to one of the teacher's classes of the same grade, for this term or another. */
export function CopyUnitDialog({ open, onOpenChange, source, classes, classesLoading, copying, error, onCopy }: Props) {
  const options = sameGradeClasses(classes, source.gradeId);
  const [picked, setPicked] = useState('');
  const classId = copyClassChoice(picked, options);
  const [term, setTerm] = useState(source.termNumber);
  const [title, setTitle] = useState<string | null>(null);
  const shownTitle = title ?? copyTitleFor(source.title, term, source.termNumber);

  return (
    // While copying, the dialog stays open so the result (or the reason it failed) is seen.
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!copying) onOpenChange(next); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to a class</DialogTitle>
          <DialogDescription>
            You get your own copy to check and release. Changing it never changes the original.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {classesLoading && options.length === 0 ? <LoadingSpinner /> : null}
          {!classesLoading && options.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {source.gradeName
                ? <>This unit is for {source.gradeName}, and you don&apos;t teach a {source.gradeName} class.</>
                : <>You don&apos;t teach a class in this unit&apos;s grade.</>}
            </p>
          ) : null}
          {options.length > 0 ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="copy-class">Class</Label>
                <Select value={classId} onValueChange={(v: unknown) => setPicked(String(v))}>
                  <SelectTrigger id="copy-class" className="w-full"><SelectValue placeholder="Pick a class" /></SelectTrigger>
                  <SelectContent>
                    {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="copy-term">Term</Label>
                <Select value={String(term)} onValueChange={(v: unknown) => setTerm(Number(v))}>
                  <SelectTrigger id="copy-term" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => <SelectItem key={t} value={String(t)}>Term {t}{t === source.termNumber ? ' (same term)' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="copy-title">Title</Label>
                <Input id="copy-title" value={shownTitle} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
            </>
          ) : null}
          {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={copying} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button
            onClick={() => onCopy({ classId, termNumber: term, ...(title?.trim() ? { title: title.trim() } : {}) })}
            disabled={copying || options.length === 0 || !classId}
            className="min-h-11 gap-1.5 sm:min-h-9"
          >
            <Copy className="h-4 w-4" aria-hidden /> {copying ? 'Copying…' : 'Copy unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
