'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { createBiometric } from '@/hooks/useFitness';
import type { SportPlayer, SportTeam } from '@/types/sport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: SportTeam[];
  onSuccess: () => void;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BiometricFormDialog({ open, onOpenChange, teams, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [restingHrBpm, setRestingHrBpm] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedTeamId('');
    setStudentId('');
    setDate(todayISO());
    setWeightKg('');
    setHeightCm('');
    setBodyFatPct('');
    setRestingHrBpm('');
    setNotes('');
  }, [open]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const playerOptions: SportPlayer[] = selectedTeam?.playerIds ?? [];

  function parseNum(s: string): number | undefined {
    if (!s.trim()) return undefined;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      toast.error('Please select a player');
      return;
    }
    if (!date) {
      toast.error('Date is required');
      return;
    }
    const weight = parseNum(weightKg);
    const height = parseNum(heightCm);
    const bodyFat = parseNum(bodyFatPct);
    const hr = parseNum(restingHrBpm);
    if (!weight && !height && !bodyFat && !hr) {
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
        bodyFatPct: bodyFat,
        restingHrBpm: hr,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
      onSuccess();
    } catch {
      // toast handled in hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record biometric measurement</DialogTitle>
          <DialogDescription>Log weight, height, body composition, and vitals.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select value={selectedTeamId} onValueChange={(v: unknown) => {
                setSelectedTeamId(v as string);
                setStudentId('');
              }}>
                <SelectTrigger id="team" className="w-full">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player">Player <span className="text-destructive">*</span></Label>
              <Select value={studentId} onValueChange={(v: unknown) => setStudentId(v as string)}>
                <SelectTrigger id="player" className="w-full">
                  <SelectValue placeholder={selectedTeam ? 'Select a player' : 'Pick a team first'} />
                </SelectTrigger>
                <SelectContent>
                  {playerOptions.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" type="number" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyFat">Body fat (%)</Label>
                <Input id="bodyFat" type="number" step="0.1" min={0} max={100} value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr">Resting HR (bpm)</Label>
                <Input id="hr" type="number" value={restingHrBpm} onChange={(e) => setRestingHrBpm(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
