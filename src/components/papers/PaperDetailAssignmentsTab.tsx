'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, Camera, Keyboard, X, AlertCircle } from 'lucide-react';
import { usePaperAssignments } from '@/hooks/usePaperAssignments';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { resolveId } from '@/lib/api-helpers';
import type { Paper, PaperAssignmentMode } from '@/types/papers';
import type { PopulatedId } from '@/types';

interface Props {
  paper: Paper;
}

function modeLabel(mode: PaperAssignmentMode): string {
  return mode === 'digital' ? 'Digital (on-screen)' : 'Printed paper';
}

export function PaperDetailAssignmentsTab({ paper }: Props) {
  const { assignments, loading, mutating, addAssignment, removeAssignment } =
    usePaperAssignments(paper._id);
  const { classes, loading: classesLoading } = useTeacherClasses();

  const [classId, setClassId] = useState('');
  const [mode, setMode] = useState<PaperAssignmentMode>('paper');
  const [releaseAt, setReleaseAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Hide classes that already have this paper assigned.
  const availableClasses = useMemo(() => {
    const assigned = new Set(assignments.map((a) => a.classId));
    return classes.filter((c) => !assigned.has(resolveId(c as unknown as PopulatedId)));
  }, [classes, assignments]);

  const handleSubmit = async () => {
    if (!classId) return;
    const ok = await addAssignment({
      classId,
      mode,
      releaseAt: releaseAt ? new Date(releaseAt).toISOString() : null,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    });
    if (ok) {
      setClassId('');
      setReleaseAt('');
      setDueAt('');
    }
  };

  if (paper.status !== 'finalised') {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Finalise the paper to assign it to a class.</p>
            <p className="text-muted-foreground">
              Draft papers can still be edited — finalising locks the question set so
              everyone in the class sees the same paper. Finalise from the header above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign to a teaching group</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v: string | null) => setClassId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  classesLoading
                    ? 'Loading classes…'
                    : availableClasses.length === 0
                      ? 'All your classes already have this paper'
                      : 'Pick a class…'
                } />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>How will students answer?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <ModeOption
                icon={Keyboard}
                title="Digital"
                description="Students take the paper on their device. AI marks against the memo."
                selected={mode === 'digital'}
                onClick={() => setMode('digital')}
              />
              <ModeOption
                icon={Camera}
                title="Printed paper"
                description="Print with answer space; collect, then OCR-scan to mark."
                selected={mode === 'paper'}
                onClick={() => setMode('paper')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="release">Release at (optional)</Label>
            <Input
              id="release"
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Due at (optional)</Label>
            <Input
              id="due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Button onClick={handleSubmit} disabled={!classId || mutating}>
              <Users className="mr-2 h-4 w-4" />
              Assign paper
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Not assigned yet"
              description="Pick a class above to give this paper to students."
            />
          ) : (
            <ul className="divide-y">
              {assignments.map((a) => {
                const cls = classes.find((c) => c.id === a.classId);
                return (
                  <li key={a._id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium truncate">{cls?.name ?? 'Unknown class'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">
                          {modeLabel(a.mode)}
                        </Badge>
                        {a.releaseAt && (
                          <span>Releases {new Date(a.releaseAt).toLocaleString()}</span>
                        )}
                        {a.dueAt && (
                          <span>Due {new Date(a.dueAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeAssignment(a._id)}
                      disabled={mutating}
                      aria-label="Remove assignment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ModeOptionProps {
  icon: typeof Camera;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function ModeOption({ icon: Icon, title, description, selected, onClick }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left rounded-lg border p-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'hover:border-primary hover:bg-accent',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
