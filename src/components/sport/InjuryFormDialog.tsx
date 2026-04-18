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
import { createInjury, updateInjury } from '@/hooks/useInjuries';
import {
  INJURY_BODY_PARTS, INJURY_TYPES, INJURY_SEVERITIES,
  INJURY_STATUSES, CLEARANCE_LEVELS,
  BODY_PART_LABELS, INJURY_TYPE_LABELS, SEVERITY_LABELS,
  STATUS_LABELS, CLEARANCE_LABELS,
  type InjuryRecord, type InjuryBodyPart, type InjuryType,
  type InjurySeverity, type InjuryStatus, type ClearanceLevel,
} from '@/types/injury';
import type { SportPlayer, SportTeam } from '@/types/sport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  injury: InjuryRecord | null;
  teams: SportTeam[];
  onSuccess: () => void;
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function playerId(p: InjuryRecord['studentId']): string {
  return typeof p === 'string' ? p : p._id;
}

function teamId(t: InjuryRecord['teamId']): string {
  if (!t) return '';
  return typeof t === 'string' ? t : t._id;
}

export function InjuryFormDialog({
  open, onOpenChange, injury, teams, onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [injuryDate, setInjuryDate] = useState('');
  const [bodyPart, setBodyPart] = useState<InjuryBodyPart>('knee');
  const [type, setType] = useState<InjuryType>('sprain');
  const [severity, setSeverity] = useState<InjurySeverity>('minor');
  const [mechanism, setMechanism] = useState('');
  const [description, setDescription] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [actualReturnDate, setActualReturnDate] = useState('');
  const [status, setStatus] = useState<InjuryStatus>('active');
  const [clearanceLevel, setClearanceLevel] = useState<ClearanceLevel>('none');

  useEffect(() => {
    if (!open) return;
    if (injury) {
      setSelectedTeamId(teamId(injury.teamId));
      setStudentId(playerId(injury.studentId));
      setInjuryDate(toDateInputValue(injury.injuryDate));
      setBodyPart(injury.bodyPart);
      setType(injury.type);
      setSeverity(injury.severity);
      setMechanism(injury.mechanism ?? '');
      setDescription(injury.description ?? '');
      setExpectedReturnDate(injury.expectedReturnDate ? toDateInputValue(injury.expectedReturnDate) : '');
      setActualReturnDate(injury.actualReturnDate ? toDateInputValue(injury.actualReturnDate) : '');
      setStatus(injury.status);
      setClearanceLevel(injury.clearanceLevel);
    } else {
      setSelectedTeamId('');
      setStudentId('');
      setInjuryDate('');
      setBodyPart('knee');
      setType('sprain');
      setSeverity('minor');
      setMechanism('');
      setDescription('');
      setExpectedReturnDate('');
      setActualReturnDate('');
      setStatus('active');
      setClearanceLevel('none');
    }
  }, [injury, open]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const playerOptions: SportPlayer[] = selectedTeam?.playerIds ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!injury) {
      if (!studentId) {
        toast.error('Please select a player');
        return;
      }
    }
    if (!injuryDate) {
      toast.error('Injury date is required');
      return;
    }
    setSubmitting(true);
    try {
      const expectedISO = expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined;
      const actualISO = actualReturnDate ? new Date(actualReturnDate).toISOString() : undefined;
      const base = {
        injuryDate: new Date(injuryDate).toISOString(),
        bodyPart,
        type,
        severity,
        mechanism: mechanism.trim() || undefined,
        description: description.trim() || undefined,
        expectedReturnDate: expectedISO,
      };
      if (injury) {
        await updateInjury(injury.id, {
          ...base,
          actualReturnDate: actualISO,
          status,
          clearanceLevel,
        });
      } else {
        await createInjury({
          ...base,
          studentId,
          teamId: selectedTeamId || undefined,
        });
      }
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
          <DialogTitle>{injury ? 'Update injury' : 'Record an injury'}</DialogTitle>
          <DialogDescription>
            {injury ? 'Update status, clearance, and return dates.' : 'Log a new injury and expected recovery.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            {!injury && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={selectedTeamId} onValueChange={(v: unknown) => {
                    setSelectedTeamId(v as string);
                    setStudentId('');
                  }}>
                    <SelectTrigger id="team" className="w-full">
                      <SelectValue placeholder="Select a team (optional)" />
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
                      <SelectValue placeholder={selectedTeam ? 'Select a player' : 'Pick a team first to list players'} />
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="injuryDate">Injury date <span className="text-destructive">*</span></Label>
              <Input
                id="injuryDate"
                type="date"
                value={injuryDate}
                onChange={(e) => setInjuryDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Body part</Label>
                <Select value={bodyPart} onValueChange={(v: unknown) => setBodyPart(v as InjuryBodyPart)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INJURY_BODY_PARTS.map((b) => (
                      <SelectItem key={b} value={b}>{BODY_PART_LABELS[b]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: unknown) => setType(v as InjuryType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INJURY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{INJURY_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v: unknown) => setSeverity(v as InjurySeverity)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INJURY_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mechanism">Mechanism</Label>
              <Input
                id="mechanism"
                value={mechanism}
                onChange={(e) => setMechanism(e.target.value)}
                placeholder="e.g. Twisted ankle in training"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / notes</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expectedReturn">Expected return</Label>
                <Input
                  id="expectedReturn"
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>
              {injury && (
                <div className="space-y-2">
                  <Label htmlFor="actualReturn">Actual return</Label>
                  <Input
                    id="actualReturn"
                    type="date"
                    value={actualReturnDate}
                    onChange={(e) => setActualReturnDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {injury && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: unknown) => setStatus(v as InjuryStatus)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INJURY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Clearance</Label>
                  <Select value={clearanceLevel} onValueChange={(v: unknown) => setClearanceLevel(v as ClearanceLevel)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLEARANCE_LEVELS.map((c) => (
                        <SelectItem key={c} value={c}>{CLEARANCE_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : injury ? 'Save changes' : 'Record injury'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
