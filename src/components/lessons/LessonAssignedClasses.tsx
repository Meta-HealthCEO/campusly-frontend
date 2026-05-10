'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { Lesson, LessonAssignment, UpdateAssignmentPayload } from '@/types/lesson';

interface Props {
  assignedClasses: Lesson['assignedClasses'];
  onAssign: (classId: string, scheduledDate: string) => Promise<unknown>;
  onUnassign: (classId: string) => Promise<unknown>;
  onUpdate: (classId: string, patch: UpdateAssignmentPayload) => Promise<unknown>;
}

/** Local-time YYYY-MM-DD — avoids the toISOString UTC pitfall. */
function toLocalDateInput(value: string | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readClassId(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : rel._id;
}

function readClassName(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : rel.name;
}

function formatScheduled(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LessonAssignedClasses({
  assignedClasses,
  onAssign,
  onUnassign,
  onUpdate,
}: Props) {
  const { classes } = useTeacherClasses();

  // Pop-overs use uncontrolled `open` via base-ui defaults, but we need
  // controlled open for the assign-new flow so we can close after submit.
  const [openAssignNew, setOpenAssignNew] = useState(false);
  const [newClassId, setNewClassId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignedIds = useMemo(
    () => new Set(assignedClasses.map((a) => readClassId(a.classId))),
    [assignedClasses],
  );
  const availableClasses = useMemo(
    () => classes.filter((c) => !assignedIds.has(c.id)),
    [classes, assignedIds],
  );

  const canSubmitNew =
    !!newClassId && !!newDate && !submitting && !assignedIds.has(newClassId);

  const handleAssignNew = async () => {
    if (!canSubmitNew) return;
    setSubmitting(true);
    try {
      // Convert the date input (YYYY-MM-DD, local) to a midnight-local Date,
      // then to ISO. Avoids the off-by-one that `new Date('2026-05-10')` causes
      // in positive UTC offsets.
      const [y, m, d] = newDate.split('-').map(Number);
      const local = new Date(y, (m ?? 1) - 1, d ?? 1);
      await onAssign(newClassId, local.toISOString());
      setNewClassId('');
      setNewDate('');
      setOpenAssignNew(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Assigned classes
      </Label>

      {assignedClasses.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Not scheduled. This is a library lesson — assign it to a class to put
          it on the calendar.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {assignedClasses.map((a) => {
            const cid = readClassId(a.classId);
            return (
              <li key={cid}>
                <AssignmentChip
                  assignment={a}
                  onUpdate={onUpdate}
                  onUnassign={onUnassign}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Popover open={openAssignNew} onOpenChange={setOpenAssignNew}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="default"
              className="w-full"
              disabled={availableClasses.length === 0}
            />
          }
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          {availableClasses.length === 0 ? 'All classes assigned' : 'Assign to a class'}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-2.5">
            <Label className="text-xs">Class</Label>
            <Select value={newClassId} onValueChange={(v: unknown) => setNewClassId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-xs">Scheduled date</Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full"
            />

            <Button
              type="button"
              size="default"
              className="w-full"
              disabled={!canSubmitNew}
              onClick={handleAssignNew}
            >
              {submitting ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ChipProps {
  assignment: LessonAssignment;
  onUpdate: (classId: string, patch: UpdateAssignmentPayload) => Promise<unknown>;
  onUnassign: (classId: string) => Promise<unknown>;
}

function AssignmentChip({ assignment, onUpdate, onUnassign }: ChipProps) {
  const cid = readClassId(assignment.classId);
  const className = readClassName(assignment.classId);
  const [open, setOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(toLocalDateInput(assignment.scheduledDate));
  const [statusDraft, setStatusDraft] = useState<LessonAssignment['status']>(assignment.status);
  const [busy, setBusy] = useState(false);

  // Reset drafts whenever the popover opens — keeps optimistic UI in sync if
  // the parent prop changed since last open.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDateDraft(toLocalDateInput(assignment.scheduledDate));
      setStatusDraft(assignment.status);
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const patch: UpdateAssignmentPayload = {};
      const currentDate = toLocalDateInput(assignment.scheduledDate);
      if (dateDraft && dateDraft !== currentDate) {
        const [y, m, d] = dateDraft.split('-').map(Number);
        const local = new Date(y, (m ?? 1) - 1, d ?? 1);
        patch.scheduledDate = local.toISOString();
      }
      if (statusDraft !== assignment.status) {
        patch.status = statusDraft;
      }
      if (patch.scheduledDate || patch.status) {
        await onUpdate(cid, patch);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await onUnassign(cid);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const statusBadge =
    assignment.status === 'taught'
      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
      : 'bg-blue-500/15 text-blue-700 border-blue-500/30';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-accent"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{className}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatScheduled(assignment.scheduledDate)}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${statusBadge}`}
        >
          {assignment.status}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="space-y-2.5">
          <div>
            <p className="text-xs font-medium">{className}</p>
          </div>

          <Label className="text-xs">Scheduled date</Label>
          <Input
            type="date"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            className="w-full"
          />

          <Label className="text-xs">Status</Label>
          <Select
            value={statusDraft}
            onValueChange={(v: unknown) => setStatusDraft(v as LessonAssignment['status'])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="taught">Taught</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="default"
              className="flex-1"
              disabled={busy}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy}
              onClick={handleRemove}
              aria-label="Remove assignment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
