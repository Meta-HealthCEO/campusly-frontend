'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
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
import { createResult, updateResult } from '@/hooks/useSportMutations';
import type { MatchResult, SportPlayer } from '@/types/sport';

interface ScorerRow {
  studentId: string;
  goals: number;
}

interface ResultFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  fixtureId: string;
  players: SportPlayer[];
  existingResult: MatchResult | null;
  onSuccess: () => void;
}

export function ResultFormDialog({
  open, onOpenChange, schoolId, fixtureId, players, existingResult, onSuccess,
}: ResultFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [scorers, setScorers] = useState<ScorerRow[]>([]);
  const [manOfTheMatch, setManOfTheMatch] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingResult) {
      setHomeScore(existingResult.homeScore);
      setAwayScore(existingResult.awayScore);
      setScorers(
        existingResult.scorers.map((s) => ({
          studentId: typeof s.studentId === 'string' ? s.studentId : s.studentId._id,
          goals: s.goals,
        }))
      );
      const mom = existingResult.manOfTheMatch;
      setManOfTheMatch(typeof mom === 'string' ? mom : mom?._id ?? '');
      setNotes(existingResult.notes ?? '');
    } else {
      setHomeScore(0); setAwayScore(0); setScorers([]);
      setManOfTheMatch(''); setNotes('');
    }
  }, [existingResult, open]);

  function addScorer() {
    setScorers((prev) => [...prev, { studentId: '', goals: 1 }]);
  }

  function removeScorer(idx: number) {
    setScorers((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateScorer(idx: number, field: keyof ScorerRow, value: string | number) {
    setScorers((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        schoolId,
        homeScore,
        awayScore,
        scorers: scorers.filter((s) => s.studentId),
        manOfTheMatch: manOfTheMatch || undefined,
        notes: notes.trim() || undefined,
      };
      if (existingResult) {
        await updateResult(fixtureId, payload);
        toast.success('Match result updated');
      } else {
        await createResult(fixtureId, payload);
        toast.success('Match result created successfully');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save result';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingResult ? 'Edit Result' : 'Record Result'}</DialogTitle>
          <DialogDescription>Enter the match score and details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home-score">Home Score</Label>
              <Input id="home-score" type="number" min={0} value={homeScore}
                onChange={(e) => setHomeScore(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="away-score">Away Score</Label>
              <Input id="away-score" type="number" min={0} value={awayScore}
                onChange={(e) => setAwayScore(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Scorers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addScorer}>
                <Plus className="mr-1 h-3 w-3" /> Add Scorer
              </Button>
            </div>
            {scorers.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select value={s.studentId}
                  onValueChange={(val: unknown) => updateScorer(idx, 'studentId', val as string)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min={0} className="w-20" value={s.goals}
                  onChange={(e) => updateScorer(idx, 'goals', Number(e.target.value))} />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeScorer(idx)} aria-label="Remove scorer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Man of the Match</Label>
            <Select value={manOfTheMatch}
              onValueChange={(val: unknown) => setManOfTheMatch(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select player (optional)" />
              </SelectTrigger>
              <SelectContent>
                {players.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="result-notes">Notes</Label>
            <Textarea id="result-notes" value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder="Optional match notes" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : existingResult ? 'Update Result' : 'Save Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
