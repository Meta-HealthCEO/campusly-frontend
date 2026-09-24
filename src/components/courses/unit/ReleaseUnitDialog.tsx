'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClassOption { id: string; name: string; learners: number }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  /** Ticked when the dialog opens: the classes the unit was built for. */
  defaultClassIds: string[];
  releasing: boolean;
  onRelease: (classIds: string[]) => void;
}

/** Pick the classes that get the unit. Learners are enrolled straight away. */
export function ReleaseUnitDialog({ open, onOpenChange, classes, defaultClassIds, releasing, onRelease }: Props) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(defaultClassIds));
  const toggle = (id: string): void => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const count = picked.size;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release to your class</DialogTitle>
          <DialogDescription>Learners in the classes you pick get the unit today and can start on any phone.</DialogDescription>
        </DialogHeader>
        <ul className="flex-1 space-y-2 overflow-y-auto py-2">
          {classes.map((c: ClassOption) => (
            <li key={c.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/50">
                <Checkbox checked={picked.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{c.learners} learners</span>
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={() => onRelease([...picked])} disabled={count === 0 || releasing} className="min-h-11 gap-1.5 sm:min-h-9">
            <Send className="h-4 w-4" aria-hidden /> {releasing ? 'Releasing…' : `Release to ${count} class${count === 1 ? '' : 'es'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
