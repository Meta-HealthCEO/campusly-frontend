'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { resolveId } from '@/lib/api-helpers';
import type { Assignment, AssignmentClassPush } from '@/types/assignments';

interface Props {
  assignment: Assignment;
  onChanged: () => Promise<void>;
}

function classDisplayName(
  classes: ReadonlyArray<{ id: string; name: string }>,
  ref: AssignmentClassPush['classId'],
): string {
  if (typeof ref === 'object' && ref?.name) return ref.name;
  const id = resolveId(ref);
  return classes.find((c) => c.id === id)?.name ?? 'Unknown class';
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function AssignmentClassesTab({ assignment, onChanged }: Props) {
  const { addClassPush, removeClassPush } = useTeacherAssignments();
  const { classes, loading: classesLoading } = useTeacherClasses();

  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!classId) return;
    setSubmitting(true);
    const result = await addClassPush(assignment._id, {
      classId,
      releaseAt: releaseAt ? new Date(releaseAt).toISOString() : null,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setSubmitting(false);
    if (result) {
      setClassId('');
      setReleaseAt('');
      setDueAt('');
      setOpen(false);
      await onChanged();
    }
  };

  const handleRemove = async (classPushId: string) => {
    const result = await removeClassPush(assignment._id, classPushId);
    if (result) {
      await onChanged();
    }
  };

  const teacherClasses = classes.map((c) => ({ id: c.id, name: c.name }));
  const pushes = assignment.assignedClasses;

  if (assignment.status !== 'published') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Publish the assignment to push it to a class"
        description="Drafts can't be assigned. Publish from the header above when the brief and rubric are ready."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Pushed to classes
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Push to class
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {pushes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">
            Not yet pushed to any class. Push to a class to make it visible to students.
          </p>
        ) : (
          <ul className="divide-y">
            {pushes.map((p) => (
              <li key={p._id} className="flex items-start justify-between gap-3 px-6 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{classDisplayName(teacherClasses, p.classId)}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      <Badge variant="outline" className="mr-1.5 text-[10px]">Release</Badge>
                      {formatDateTime(p.releaseAt)}
                    </span>
                    <span>
                      <Badge variant="outline" className="mr-1.5 text-[10px]">Due</Badge>
                      {formatDateTime(p.dueAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleRemove(p._id)}
                  aria-label="Remove class push"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Push assignment to a class</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pick a class, set release and due dates. Students see the assignment
              from the release time onwards.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Class <span className="text-destructive">*</span></Label>
              <Select
                value={classId}
                onValueChange={(v: string | null) => setClassId(v ?? '')}
                disabled={classesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick class" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Release at</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(releaseAt || null)}
                  onChange={(e) => setReleaseAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — students see it from this date.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Due at</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(dueAt || null)}
                  onChange={(e) => setDueAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — used for late-policy enforcement.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleAdd()}
              disabled={!classId || submitting}
            >
              {submitting ? 'Pushing…' : 'Push to class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
