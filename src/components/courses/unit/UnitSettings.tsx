'use client';

import { ListOrdered } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Props {
  sequential: boolean;
  saving: boolean;
  onChange: (sequential: boolean) => void;
}

/** How learners move through the unit: in order, or any item they like. */
export function UnitSettings({ sequential, saving, onChange }: Props) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4" aria-labelledby="unit-order-label">
      <div className="flex items-center justify-between gap-3">
        <label id="unit-order-label" htmlFor="unit-order" className="flex items-center gap-2 text-sm font-medium">
          <ListOrdered className="h-4 w-4 text-muted-foreground" aria-hidden /> Learners go in order
        </label>
        <Switch id="unit-order" checked={sequential} disabled={saving} onCheckedChange={(v: boolean) => onChange(v)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {sequential
          ? 'Each item opens once the one before it is done.'
          : 'Learners can open any item, in any order. Nothing they finished is undone.'}
      </p>
    </section>
  );
}
