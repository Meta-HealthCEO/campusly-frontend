'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBiometric } from '@/hooks/useFitness';

interface Props {
  studentId: string;
  onAdded: () => void;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function n(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const v = Number.parseFloat(s);
  return Number.isFinite(v) ? v : undefined;
}

export function PlayerBiometricQuickAdd({ studentId, onAdded }: Props) {
  const [date, setDate] = useState(todayISO());
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [restingHrBpm, setRestingHrBpm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const weight = n(weightKg);
    const height = n(heightCm);
    const fat = n(bodyFatPct);
    const hr = n(restingHrBpm);
    if (!weight && !height && !fat && !hr) {
      toast.error('Enter at least one measurement');
      return;
    }
    setSubmitting(true);
    try {
      await createBiometric({
        studentId,
        date: new Date(date).toISOString(),
        weightKg: weight,
        heightCm: height,
        bodyFatPct: fat,
        restingHrBpm: hr,
      });
      setWeightKg('');
      setHeightCm('');
      setBodyFatPct('');
      setRestingHrBpm('');
      onAdded();
    } catch {
      // toasted
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <p className="text-sm font-semibold">Log a new measurement</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Weight (kg)</Label>
          <Input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height (cm)</Label>
          <Input type="number" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Body fat (%)</Label>
          <Input type="number" step="0.1" min={0} max={100} value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Resting HR</Label>
          <Input type="number" value={restingHrBpm} onChange={(e) => setRestingHrBpm(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleAdd} disabled={submitting} size="sm">
        {submitting ? (
          <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Saving...</>
        ) : (
          <><Plus className="mr-1 h-4 w-4" />Save measurement</>
        )}
      </Button>
    </div>
  );
}
