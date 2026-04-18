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
import { createFitnessTest } from '@/hooks/useFitness';
import { COMMON_FITNESS_TESTS } from '@/types/fitness';
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

export function FitnessTestFormDialog({ open, onOpenChange, teams, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [presetKey, setPresetKey] = useState('');
  const [testType, setTestType] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedTeamId('');
    setStudentId('');
    setPresetKey('');
    setTestType('');
    setValue('');
    setUnit('');
    setDate(todayISO());
    setNotes('');
  }, [open]);

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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const playerOptions: SportPlayer[] = selectedTeam?.playerIds ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      toast.error('Please select a player');
      return;
    }
    const numValue = Number.parseFloat(value);
    if (!Number.isFinite(numValue)) {
      toast.error('Please enter a valid numeric value');
      return;
    }
    if (!testType.trim() || !unit.trim() || !date) {
      toast.error('Test type, unit and date are required');
      return;
    }
    setSubmitting(true);
    try {
      await createFitnessTest({
        studentId,
        teamId: selectedTeamId || undefined,
        testType: testType.trim(),
        value: numValue,
        unit: unit.trim(),
        date: new Date(date).toISOString(),
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
          <DialogTitle>Record fitness test</DialogTitle>
          <DialogDescription>Log a fitness test result for a player.</DialogDescription>
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
              <Label>Test preset</Label>
              <Select value={presetKey} onValueChange={(v: unknown) => applyPreset(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a common test..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  {COMMON_FITNESS_TESTS.map((p) => (
                    <SelectItem key={p.type} value={p.type}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="testType">Test type <span className="text-destructive">*</span></Label>
                <Input
                  id="testType"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  placeholder="e.g. 40m_sprint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit <span className="text-destructive">*</span></Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. seconds"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="value">Value <span className="text-destructive">*</span></Label>
                <Input
                  id="value"
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
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
              {submitting ? 'Saving...' : 'Record test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
