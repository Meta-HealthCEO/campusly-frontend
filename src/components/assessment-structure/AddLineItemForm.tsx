'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddLineItemPayload } from '@/types';

interface Props {
  onAdd: (payload: AddLineItemPayload) => Promise<void>;
  disabled?: boolean;
}

export function AddLineItemForm({ onAdd, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setTotalMarks('');
    setDate('');
    setExpanded(false);
  };

  const handleAdd = async () => {
    if (!name.trim() || !totalMarks) return;
    setSaving(true);
    try {
      const payload: AddLineItemPayload = {
        name: name.trim(),
        totalMarks: Number(totalMarks),
      };
      if (date) payload.date = date;
      await onAdd(payload);
      reset();
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <button
        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setExpanded(true)}
        disabled={disabled}
      >
        + Add assessment
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-3 flex flex-col gap-3">
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Test 1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-marks">Total Marks <span className="text-destructive">*</span></Label>
          <Input
            id="item-marks"
            type="number"
            min={1}
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            placeholder="e.g. 100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-date">Date (optional)</Label>
          <Input
            id="item-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim() || !totalMarks}>
          Add
        </Button>
      </div>
    </div>
  );
}
