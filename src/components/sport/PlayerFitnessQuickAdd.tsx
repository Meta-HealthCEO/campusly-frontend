'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { createFitnessTest } from '@/hooks/useFitness';
import { COMMON_FITNESS_TESTS } from '@/types/fitness';

interface Props {
  studentId: string;
  sportCode: string;
  teamId?: string;
  onAdded: () => void;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PlayerFitnessQuickAdd({ studentId, sportCode, teamId, onAdded }: Props) {
  const [presetKey, setPresetKey] = useState('');
  const [testType, setTestType] = useState('');
  const [unit, setUnit] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);

  function applyPreset(key: string) {
    setPresetKey(key);
    if (key === 'custom') {
      setTestType('');
      setUnit('');
      return;
    }
    const preset = COMMON_FITNESS_TESTS.find((p) => p.type === key);
    if (preset) {
      setTestType(preset.type);
      setUnit(preset.unit);
    }
  }

  async function handleAdd() {
    const num = Number.parseFloat(value);
    if (!testType.trim() || !unit.trim() || !Number.isFinite(num)) {
      toast.error('Pick a test type and enter a numeric value');
      return;
    }
    setSubmitting(true);
    try {
      await createFitnessTest({
        studentId,
        teamId,
        sportCode,
        testType: testType.trim(),
        value: num,
        unit: unit.trim(),
        date: new Date(date).toISOString(),
      });
      setValue('');
      setPresetKey('');
      setTestType('');
      setUnit('');
      onAdded();
    } catch {
      // toasted in hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <p className="text-sm font-semibold">Add a new test result</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Test</Label>
          <Select value={presetKey} onValueChange={(v: unknown) => applyPreset(v as string)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pick a test..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              {COMMON_FITNESS_TESTS.map((p) => (
                <SelectItem key={p.type} value={p.type}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {presetKey === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Test type</Label>
              <Input value={testType} onChange={(e) => setTestType(e.target.value)} placeholder="e.g. broad_jump" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. cm" />
            </div>
          </>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Value {unit && <span className="text-muted-foreground">({unit})</span>}</Label>
          <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAdd} disabled={submitting} className="w-full">
            {submitting ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Plus className="mr-1 h-4 w-4" />Add result</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
