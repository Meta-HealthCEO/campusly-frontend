'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AddCategoryPayload, CategoryType } from '@/types';

interface Props {
  onAdd: (payload: AddCategoryPayload) => Promise<unknown>;
  disabled?: boolean;
}

const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

export function AddCategoryForm({ onAdd, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('test');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setType('test');
    setWeight('');
    setExpanded(false);
  };

  const handleAdd = async () => {
    if (!name.trim() || !weight) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), type, weight: Number(weight) });
      reset();
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(true)}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <Plus className="mr-1.5 size-4" />
        Add Category
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-4 flex flex-col gap-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Term Tests"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-type">Type <span className="text-destructive">*</span></Label>
          <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
            <SelectTrigger id="cat-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cat-weight">Weight % <span className="text-destructive">*</span></Label>
          <Input
            id="cat-weight"
            type="number"
            min={0}
            max={100}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 40"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim() || !weight}>
          Add
        </Button>
      </div>
    </div>
  );
}
