'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  initial: string[];
  onSave: (next: string[]) => Promise<void>;
}

export function LessonObjectivesEditor({ initial, onSave }: Props) {
  const [draft, setDraft] = useState<string[]>(
    initial.length > 0 ? initial : [''],
  );

  const commit = async (next: string[]) => {
    const cleaned = next.map((o) => o.trim()).filter(Boolean);
    const same =
      cleaned.length === initial.length &&
      cleaned.every((o, i) => o === initial[i]);
    if (same) return;
    try {
      await onSave(cleaned);
    } catch {
      setDraft(initial.length > 0 ? initial : ['']);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Objectives
      </Label>
      <div className="space-y-1.5">
        {draft.map((obj, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              value={obj}
              onChange={(e) => {
                const copy = [...draft];
                copy[idx] = e.target.value;
                setDraft(copy);
              }}
              onBlur={() => void commit(draft)}
              placeholder={`Objective ${idx + 1}`}
              className="text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove objective"
              onClick={() => {
                const copy = draft.filter((_, i) => i !== idx);
                const next = copy.length > 0 ? copy : [''];
                setDraft(next);
                void commit(next);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDraft([...draft, ''])}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add objective
      </Button>
    </div>
  );
}
