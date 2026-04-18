# Teacher Timetable — Self-Managed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable standalone teachers to configure their school day (periods/times/breaks) and manage their own weekly timetable via an interactive grid editor.

**Architecture:** Backend-first — fix multi-tenancy bug, widen route permissions, add ownership guard. Then build the frontend hook combining config + CRUD, followed by the UI components (dialogs, grid, mobile view) and finally the revised page orchestrator.

**Tech Stack:** Express/MongoDB (backend), Next.js 16 / React 19, React Hook Form + Zod, Tailwind CSS 4, Sonner toasts, shadcn Dialog/Select/Input/Button components.

**Spec:** `docs/superpowers/specs/2026-04-14-teacher-timetable-self-managed-design.md`

---

## File Map

### Backend (campusly-backend)

| File | Action | Responsibility |
|---|---|---|
| `src/modules/Academic/services/misc.service.ts` | Modify | Add `schoolId` param to `getByTeacher` |
| `src/modules/Academic/controller.ts` | Modify | Pass `schoolId` to `getByTeacher`, add teacher ownership guard on create/update/delete |
| `src/modules/Academic/routes.ts` | Modify | Add `teacher` role to PUT/DELETE timetable routes |
| `src/modules/TimetableBuilder/routes.ts` | Modify | Add `teacher` role to GET/PUT config routes |

### Frontend (campusly-frontend)

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/useTeacherTimetableManager.ts` | Create | Config fetch/save + timetable CRUD hook |
| `src/components/timetable/PeriodConfigDialog.tsx` | Create | Period count, times, breaks configuration dialog |
| `src/components/timetable/TimetableSlotDialog.tsx` | Create | Create/edit/delete a single timetable slot |
| `src/components/timetable/TimetableGrid.tsx` | Create | Interactive desktop weekly grid |
| `src/components/timetable/TimetableMobileView.tsx` | Create | Interactive mobile card layout |
| `src/app/(dashboard)/teacher/timetable/page.tsx` | Rewrite | Thin orchestrator with config guard |

---

## Task 1: Fix `getByTeacher` multi-tenancy bug

**Files:**
- Modify: `campusly-backend/src/modules/Academic/services/misc.service.ts:102-109`
- Modify: `campusly-backend/src/modules/Academic/controller.ts:247-250`

- [ ] **Step 1: Update `getByTeacher` to accept and filter by `schoolId`**

In `campusly-backend/src/modules/Academic/services/misc.service.ts`, change the `getByTeacher` method:

```ts
  static async getByTeacher(teacherId: string, schoolId: string): Promise<ITimetable[]> {
    return Timetable.find({ teacherId, schoolId, isDeleted: false })
      .populate('classId', 'name gradeId')
      .populate('subjectId', 'name code')
      .sort({ day: 1, period: 1 })
      .lean()
      .exec();
  }
```

- [ ] **Step 2: Update the controller to pass `schoolId`**

In `campusly-backend/src/modules/Academic/controller.ts`, update `getTimetableByTeacher`:

```ts
  static async getTimetableByTeacher(req: Request, res: Response): Promise<void> {
    const schoolId = req.user!.schoolId!;
    const entries = await AcademicService.getByTeacher(req.params.teacherId as string, schoolId);
    res.json(apiResponse(true, entries, 'Teacher timetable retrieved successfully'));
  }
```

- [ ] **Step 3: Update the service barrel**

In `campusly-backend/src/modules/Academic/service.ts`, the barrel re-export `static getByTeacher = MiscAcademicService.getByTeacher;` is already a static reference — no change needed since the method signature is compatible.

- [ ] **Step 4: Verify the backend compiles**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /c/Users/shaun/campusly-backend
git add src/modules/Academic/services/misc.service.ts src/modules/Academic/controller.ts
git commit -m "fix(academic): add schoolId filter to getByTeacher for multi-tenancy"
```

---

## Task 2: Widen route permissions for teacher timetable CRUD

**Files:**
- Modify: `campusly-backend/src/modules/Academic/routes.ts:216-229`
- Modify: `campusly-backend/src/modules/TimetableBuilder/routes.ts:20-21`

- [ ] **Step 1: Add `teacher` to PUT/DELETE timetable routes**

In `campusly-backend/src/modules/Academic/routes.ts`, update the two route definitions:

```ts
router.put(
  '/timetable/:id',
  authenticate,
  authorize('super_admin', 'school_admin', 'teacher'),
  validate(updateTimetableSchema),
  AcademicController.updateTimetable,
);

router.delete(
  '/timetable/:id',
  authenticate,
  authorize('super_admin', 'school_admin', 'teacher'),
  AcademicController.deleteTimetable,
);
```

- [ ] **Step 2: Add `teacher` to timetable-builder config routes**

In `campusly-backend/src/modules/TimetableBuilder/routes.ts`, update the two config routes. Replace:

```ts
const adminOnly = authorize('school_admin', 'super_admin');
```

And change only the config routes (not the whole `adminOnly` const, since other routes must stay admin-only):

```ts
const adminOnly = authorize('school_admin', 'super_admin');
const adminOrTeacher = authorize('school_admin', 'super_admin', 'teacher');

// ─── Config ─────────────────────────────────────────────────────────────────

router.get('/config', adminOrTeacher, TimetableBuilderController.getConfig);
router.put('/config', adminOrTeacher, validate(configSchema), TimetableBuilderController.updateConfig);
```

- [ ] **Step 3: Verify the backend compiles**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /c/Users/shaun/campusly-backend
git add src/modules/Academic/routes.ts src/modules/TimetableBuilder/routes.ts
git commit -m "feat(academic): allow teachers to manage their own timetable entries and config"
```

---

## Task 3: Add teacher ownership guard in controller

**Files:**
- Modify: `campusly-backend/src/modules/Academic/controller.ts:234-262`

- [ ] **Step 1: Update `createTimetable` to enforce teacher ownership**

In `campusly-backend/src/modules/Academic/controller.ts`, replace the `createTimetable` method:

```ts
  static async createTimetable(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const data = { ...req.body };

    // Teachers can only create entries for themselves
    if (user.role === 'teacher') {
      data.teacherId = user.id;
      data.schoolId = user.schoolId;
    }

    const entry = await AcademicService.createTimetable(data);
    res.status(201).json(apiResponse(true, entry, 'Timetable entry created successfully'));
  }
```

- [ ] **Step 2: Update `updateTimetable` to enforce teacher ownership**

Replace the `updateTimetable` method:

```ts
  static async updateTimetable(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const schoolId = user.schoolId!;

    // Teachers can only update their own entries
    if (user.role === 'teacher') {
      const existing = await AcademicService.getTimetableById(req.params.id as string, schoolId);
      if (String(existing.teacherId) !== String(user.id)) {
        res.status(403).json(apiResponse(false, undefined, undefined, 'You can only edit your own timetable entries'));
        return;
      }
    }

    const entry = await AcademicService.updateTimetable(req.params.id as string, schoolId, req.body);
    res.json(apiResponse(true, entry, 'Timetable entry updated successfully'));
  }
```

- [ ] **Step 3: Update `deleteTimetable` to enforce teacher ownership**

Replace the `deleteTimetable` method:

```ts
  static async deleteTimetable(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const schoolId = user.schoolId!;

    // Teachers can only delete their own entries
    if (user.role === 'teacher') {
      const existing = await AcademicService.getTimetableById(req.params.id as string, schoolId);
      if (String(existing.teacherId) !== String(user.id)) {
        res.status(403).json(apiResponse(false, undefined, undefined, 'You can only delete your own timetable entries'));
        return;
      }
    }

    await AcademicService.deleteTimetable(req.params.id as string, schoolId);
    res.json(apiResponse(true, undefined, 'Timetable entry deleted successfully'));
  }
```

- [ ] **Step 4: Verify the backend compiles**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /c/Users/shaun/campusly-backend
git add src/modules/Academic/controller.ts
git commit -m "feat(academic): add teacher ownership guard for timetable CRUD"
```

---

## Task 4: Create `useTeacherTimetableManager` hook

**Files:**
- Create: `campusly-frontend/src/hooks/useTeacherTimetableManager.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useTeacherTimetableManager.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { TimetableSlot } from '@/types';
import type { TimetableConfig } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface CreateSlotPayload {
  classId: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  room?: string;
}

export function useTeacherTimetableManager() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const hasConfig = Boolean(config && config.periodTimes.length > 0);

  // ─── Fetch timetable ─────────────────────────────────────────────────

  const fetchTimetable = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiClient.get(`/academic/timetable/teacher/${user.id}`);
      setTimetable(unwrapList<TimetableSlot>(res));
    } catch (err: unknown) {
      console.error('Failed to load timetable', err);
      toast.error('Could not load timetable.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ─── Fetch config ────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiClient.get('/timetable-builder/config');
      setConfig(unwrapResponse<TimetableConfig>(res));
    } catch {
      // 404 or error means no config yet — that's fine
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable();
    fetchConfig();
  }, [fetchTimetable, fetchConfig]);

  // ─── Config mutations ────────────────────────────────────────────────

  const saveConfig = useCallback(async (data: Partial<TimetableConfig>) => {
    try {
      const res = await apiClient.put('/timetable-builder/config', data);
      const saved = unwrapResponse<TimetableConfig>(res);
      setConfig(saved);
      toast.success('Period configuration saved');
    } catch (err: unknown) {
      console.error('Failed to save config', err);
      toast.error('Failed to save configuration.');
      throw err;
    }
  }, []);

  // ─── Timetable mutations ─────────────────────────────────────────────

  const createSlot = useCallback(async (data: CreateSlotPayload) => {
    try {
      await apiClient.post('/academic/timetable', {
        ...data,
        teacherId: user?.id,
        schoolId: user?.schoolId,
      });
      toast.success('Timetable entry added');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to create slot', err);
      toast.error('Failed to add timetable entry.');
      throw err;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const updateSlot = useCallback(async (id: string, data: Partial<CreateSlotPayload>) => {
    try {
      await apiClient.put(`/academic/timetable/${id}`, {
        ...data,
        teacherId: user?.id,
        schoolId: user?.schoolId,
      });
      toast.success('Timetable entry updated');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to update slot', err);
      toast.error('Failed to update timetable entry.');
      throw err;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const deleteSlot = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/academic/timetable/${id}`);
      toast.success('Timetable entry removed');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to delete slot', err);
      toast.error('Failed to remove timetable entry.');
      throw err;
    }
  }, [fetchTimetable]);

  return {
    timetable,
    loading,
    config,
    configLoading,
    hasConfig,
    saveConfig,
    createSlot,
    updateSlot,
    deleteSlot,
    refetch: fetchTimetable,
  };
}
```

- [ ] **Step 2: Verify the frontend compiles**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors related to the new hook

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/hooks/useTeacherTimetableManager.ts
git commit -m "feat(timetable): add useTeacherTimetableManager hook with config + CRUD"
```

---

## Task 5: Create `PeriodConfigDialog` component

**Files:**
- Create: `campusly-frontend/src/components/timetable/PeriodConfigDialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/timetable/PeriodConfigDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import type { TimetableConfig, PeriodTime, BreakSlot } from '@/types/timetable-builder';

interface PeriodConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TimetableConfig | null;
  onSave: (data: Partial<TimetableConfig>) => Promise<void>;
  hasOrphanedSlots?: (periodCount: number) => boolean;
}

function generateDefaultTimes(count: number): PeriodTime[] {
  const times: PeriodTime[] = [];
  let startMinutes = 7 * 60 + 30; // 07:30
  for (let i = 1; i <= count; i++) {
    const endMinutes = startMinutes + 45;
    times.push({
      period: i,
      startTime: `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
    });
    startMinutes = endMinutes + 5; // 5-min gap between periods
  }
  return times;
}

export function PeriodConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  hasOrphanedSlots,
}: PeriodConfigDialogProps) {
  const [periodCount, setPeriodCount] = useState(7);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(() => generateDefaultTimes(7));
  const [breakSlots, setBreakSlots] = useState<BreakSlot[]>([
    { afterPeriod: 3, duration: 30, label: 'Break' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (config && config.periodTimes.length > 0) {
      const count = config.periodTimes.length;
      setPeriodCount(count);
      setPeriodTimes(config.periodTimes);
      setBreakSlots(config.breakSlots ?? []);
    } else {
      setPeriodCount(7);
      setPeriodTimes(generateDefaultTimes(7));
      setBreakSlots([{ afterPeriod: 3, duration: 30, label: 'Break' }]);
    }
  }, [open, config]);

  const handlePeriodCountChange = (newCount: number) => {
    const clamped = Math.max(1, Math.min(10, newCount));
    setPeriodCount(clamped);
    if (clamped > periodTimes.length) {
      // Add new periods with sensible times continuing from the last
      const lastEnd = periodTimes.length > 0
        ? timeToMinutes(periodTimes[periodTimes.length - 1].endTime) + 5
        : 7 * 60 + 30;
      const newTimes = [...periodTimes];
      for (let i = periodTimes.length + 1; i <= clamped; i++) {
        const start = lastEnd + (i - periodTimes.length - 1) * 50;
        const end = start + 45;
        newTimes.push({
          period: i,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
        });
      }
      setPeriodTimes(newTimes);
    } else {
      setPeriodTimes(periodTimes.slice(0, clamped));
      // Remove break slots that reference periods beyond the new count
      setBreakSlots(breakSlots.filter((b) => b.afterPeriod < clamped));
    }
  };

  const updatePeriodTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriodTimes((prev) =>
      prev.map((pt, i) => (i === index ? { ...pt, [field]: value } : pt)),
    );
  };

  const addBreak = () => {
    setBreakSlots([...breakSlots, { afterPeriod: 1, duration: 15, label: 'Break' }]);
  };

  const updateBreak = (index: number, field: keyof BreakSlot, value: string | number) => {
    setBreakSlots((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  };

  const removeBreak = (index: number) => {
    setBreakSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const periodsPerDay = {
        monday: periodCount,
        tuesday: periodCount,
        wednesday: periodCount,
        thursday: periodCount,
        friday: periodCount,
      };
      await onSave({
        periodsPerDay,
        periodTimes,
        breakSlots,
        academicYear: new Date().getFullYear(),
        term: 1,
      });
      onOpenChange(false);
    } catch {
      // Error already toasted by hook
    } finally {
      setSaving(false);
    }
  };

  const showOrphanWarning = hasOrphanedSlots
    && config
    && config.periodTimes.length > 0
    && periodCount < config.periodTimes.length
    && hasOrphanedSlots(periodCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure School Day</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Period count */}
          <div className="space-y-2">
            <Label>Periods per day</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={periodCount}
              onChange={(e) => handlePeriodCountChange(Number(e.target.value))}
              className="w-full sm:w-24"
            />
          </div>

          {showOrphanWarning && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              You have timetable entries in periods that will no longer appear.
              Those entries will be hidden but not deleted.
            </div>
          )}

          {/* Period times */}
          <div className="space-y-2">
            <Label>Period times</Label>
            <div className="space-y-2">
              {periodTimes.map((pt, i) => (
                <div key={pt.period} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8 shrink-0">P{pt.period}</span>
                  <Input
                    type="time"
                    value={pt.startTime}
                    onChange={(e) => updatePeriodTime(i, 'startTime', e.target.value)}
                    className="w-full sm:w-32"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={pt.endTime}
                    onChange={(e) => updatePeriodTime(i, 'endTime', e.target.value)}
                    className="w-full sm:w-32"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Breaks */}
          <div className="space-y-2">
            <Label>Breaks</Label>
            {breakSlots.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">After P</span>
                <Input
                  type="number"
                  min={1}
                  max={periodCount - 1}
                  value={b.afterPeriod}
                  onChange={(e) => updateBreak(i, 'afterPeriod', Number(e.target.value))}
                  className="w-full sm:w-16"
                />
                <Input
                  type="number"
                  min={1}
                  value={b.duration}
                  onChange={(e) => updateBreak(i, 'duration', Number(e.target.value))}
                  className="w-full sm:w-16"
                  placeholder="min"
                />
                <Input
                  value={b.label}
                  onChange={(e) => updateBreak(i, 'label', e.target.value)}
                  className="flex-1"
                  placeholder="Label"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBreak(i)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addBreak}>
              + Add Break
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors related to the new component

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/timetable/PeriodConfigDialog.tsx
git commit -m "feat(timetable): add PeriodConfigDialog for school day setup"
```

---

## Task 6: Create `TimetableSlotDialog` component

**Files:**
- Create: `campusly-frontend/src/components/timetable/TimetableSlotDialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/timetable/TimetableSlotDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import type { TimetableSlot, Subject, SchoolClass } from '@/types';
import type { PeriodTime } from '@/types/timetable-builder';
import type { CreateSlotPayload } from '@/hooks/useTeacherTimetableManager';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

interface SlotFormData {
  subjectId: string;
  classId: string;
  room: string;
}

interface TimetableSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: DayOfWeek;
  period: number;
  periodTime: PeriodTime | undefined;
  subjects: Subject[];
  classes: SchoolClass[];
  existingSlot: TimetableSlot | null;
  onCreate: (data: CreateSlotPayload) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateSlotPayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TimetableSlotDialog({
  open,
  onOpenChange,
  day,
  period,
  periodTime,
  subjects,
  classes,
  existingSlot,
  onCreate,
  onUpdate,
  onDelete,
}: TimetableSlotDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEditing = Boolean(existingSlot);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<SlotFormData>({
    defaultValues: { subjectId: '', classId: '', room: '' },
  });

  useEffect(() => {
    if (!open) return;
    if (existingSlot) {
      const subId = typeof existingSlot.subjectId === 'string'
        ? existingSlot.subjectId
        : (existingSlot.subjectId as unknown as { _id?: string })?._id ?? '';
      const clsId = typeof existingSlot.classId === 'string'
        ? existingSlot.classId
        : (existingSlot.classId as unknown as { _id?: string })?._id ?? '';
      reset({ subjectId: subId, classId: clsId, room: existingSlot.room ?? '' });
    } else {
      reset({ subjectId: '', classId: '', room: '' });
    }
  }, [open, existingSlot, reset]);

  const onSubmit = async (data: SlotFormData) => {
    if (!periodTime) return;
    setSaving(true);
    try {
      const payload: CreateSlotPayload = {
        classId: data.classId,
        day,
        period,
        startTime: periodTime.startTime,
        endTime: periodTime.endTime,
        subjectId: data.subjectId,
        room: data.room || undefined,
      };
      if (isEditing && existingSlot) {
        await onUpdate(existingSlot.id, payload);
      } else {
        await onCreate(payload);
      }
      onOpenChange(false);
    } catch {
      // Error already toasted by hook
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSlot) return;
    setDeleting(true);
    try {
      await onDelete(existingSlot.id);
      onOpenChange(false);
    } catch {
      // Error already toasted by hook
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Add'} — {dayLabels[day]} P{period}
          </DialogTitle>
          {periodTime && (
            <p className="text-sm text-muted-foreground">
              {periodTime.startTime} – {periodTime.endTime}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subjectId">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(val: unknown) => setValue('subjectId', val as string)}
                defaultValue={existingSlot
                  ? (typeof existingSlot.subjectId === 'string'
                    ? existingSlot.subjectId
                    : (existingSlot.subjectId as unknown as { _id?: string })?._id ?? '')
                  : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subjectId && (
                <p className="text-xs text-destructive">{errors.subjectId.message}</p>
              )}
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label htmlFor="classId">
                Class <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(val: unknown) => setValue('classId', val as string)}
                defaultValue={existingSlot
                  ? (typeof existingSlot.classId === 'string'
                    ? existingSlot.classId
                    : (existingSlot.classId as unknown as { _id?: string })?._id ?? '')
                  : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classId && (
                <p className="text-xs text-destructive">{errors.classId.message}</p>
              )}
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Input
                {...register('room')}
                placeholder="e.g. Room 12, Lab A"
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/timetable/TimetableSlotDialog.tsx
git commit -m "feat(timetable): add TimetableSlotDialog for slot create/edit/delete"
```

---

## Task 7: Create `TimetableGrid` component

**Files:**
- Create: `campusly-frontend/src/components/timetable/TimetableGrid.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/timetable/TimetableGrid.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimetableSlot } from '@/types';
import type { PeriodTime } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

const COLOR_PALETTE = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
  'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300',
  'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
];

interface TimetableGridProps {
  timetable: TimetableSlot[];
  periodTimes: PeriodTime[];
  now: Date;
  onSlotClick: (day: DayOfWeek, period: number, slot: TimetableSlot | null) => void;
}

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getSubjectId(slot: TimetableSlot): string {
  if (typeof slot.subjectId === 'string') return slot.subjectId;
  return (slot.subjectId as unknown as { _id?: string })?._id ?? '';
}

function getSubjectName(slot: TimetableSlot): string {
  if (slot.subject?.name) return slot.subject.name;
  if (typeof slot.subjectId === 'object' && slot.subjectId !== null) {
    return ((slot.subjectId as Record<string, unknown>).name as string) ?? 'Subject';
  }
  return 'Subject';
}

function getClassName(slot: TimetableSlot): string {
  if (typeof (slot as unknown as Record<string, unknown>).classId === 'object') {
    const cls = (slot as unknown as Record<string, unknown>).classId as Record<string, unknown>;
    return (cls.name as string) ?? '';
  }
  return '';
}

export function TimetableGrid({ timetable, periodTimes, now, onSlotClick }: TimetableGridProps) {
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const subjectColors = useMemo(() => {
    const ids = [...new Set(timetable.map(getSubjectId))];
    const map: Record<string, string> = {};
    ids.forEach((id, i) => { map[id] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [timetable]);

  const getSlot = (day: DayOfWeek, period: number) =>
    timetable.find((s) => s.day === day && s.period === period) ?? null;

  const isCurrentSlot = (slot: TimetableSlot | null): boolean => {
    if (!slot || slot.day !== today) return false;
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (start === null || end === null) return false;
    return nowMinutes >= start && nowMinutes < end;
  };

  return (
    <Card className="hidden lg:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left text-sm font-medium text-muted-foreground w-20">
                  Period
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className={cn(
                      'p-3 text-left text-sm font-medium',
                      day === today ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {DAY_LABELS[day]}
                    {day === today && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        Today
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodTimes.map((pt) => (
                <tr key={pt.period} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="text-sm font-medium">P{pt.period}</div>
                    <div className="text-xs text-muted-foreground">
                      {pt.startTime} – {pt.endTime}
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    const slot = getSlot(day, pt.period);
                    const current = isCurrentSlot(slot);

                    if (!slot) {
                      return (
                        <td key={day} className="p-2">
                          <button
                            type="button"
                            onClick={() => onSlotClick(day, pt.period, null)}
                            className="w-full rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td key={day} className="p-2">
                        <button
                          type="button"
                          onClick={() => onSlotClick(day, pt.period, slot)}
                          className={cn(
                            'w-full rounded-lg border p-3 space-y-0.5 text-left cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all',
                            subjectColors[getSubjectId(slot)] || 'bg-muted',
                            current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{getSubjectName(slot)}</p>
                            {current && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                                Now
                              </span>
                            )}
                          </div>
                          {getClassName(slot) && (
                            <p className="text-xs opacity-80 truncate">{getClassName(slot)}</p>
                          )}
                          {slot.room && (
                            <p className="text-xs opacity-80 truncate">{slot.room}</p>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/timetable/TimetableGrid.tsx
git commit -m "feat(timetable): add interactive TimetableGrid desktop component"
```

---

## Task 8: Create `TimetableMobileView` component

**Files:**
- Create: `campusly-frontend/src/components/timetable/TimetableMobileView.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/timetable/TimetableMobileView.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimetableSlot } from '@/types';
import type { PeriodTime } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

const COLOR_PALETTE = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
  'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300',
  'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
];

interface TimetableMobileViewProps {
  timetable: TimetableSlot[];
  periodTimes: PeriodTime[];
  now: Date;
  onSlotClick: (day: DayOfWeek, period: number, slot: TimetableSlot | null) => void;
}

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getSubjectId(slot: TimetableSlot): string {
  if (typeof slot.subjectId === 'string') return slot.subjectId;
  return (slot.subjectId as unknown as { _id?: string })?._id ?? '';
}

function getSubjectName(slot: TimetableSlot): string {
  if (slot.subject?.name) return slot.subject.name;
  if (typeof slot.subjectId === 'object' && slot.subjectId !== null) {
    return ((slot.subjectId as Record<string, unknown>).name as string) ?? 'Subject';
  }
  return 'Subject';
}

function getClassName(slot: TimetableSlot): string {
  if (typeof (slot as unknown as Record<string, unknown>).classId === 'object') {
    const cls = (slot as unknown as Record<string, unknown>).classId as Record<string, unknown>;
    return (cls.name as string) ?? '';
  }
  return '';
}

export function TimetableMobileView({
  timetable,
  periodTimes,
  now,
  onSlotClick,
}: TimetableMobileViewProps) {
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const subjectColors = useMemo(() => {
    const ids = [...new Set(timetable.map(getSubjectId))];
    const map: Record<string, string> = {};
    ids.forEach((id, i) => { map[id] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [timetable]);

  const getSlot = (day: DayOfWeek, period: number) =>
    timetable.find((s) => s.day === day && s.period === period) ?? null;

  const isCurrentSlot = (slot: TimetableSlot | null): boolean => {
    if (!slot || slot.day !== today) return false;
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (start === null || end === null) return false;
    return nowMinutes >= start && nowMinutes < end;
  };

  return (
    <div className="space-y-4 lg:hidden">
      {DAYS.map((day) => {
        const isToday = day === today;
        return (
          <Card
            key={day}
            className={isToday ? 'border-primary/60 ring-1 ring-primary/20' : ''}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {DAY_LABELS[day]}
                {isToday && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Today
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {periodTimes.map((pt) => {
                const slot = getSlot(day, pt.period);
                const current = isCurrentSlot(slot);

                if (!slot) {
                  return (
                    <button
                      key={pt.period}
                      type="button"
                      onClick={() => onSlotClick(day, pt.period, null)}
                      className="w-full flex items-center gap-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
                        P{pt.period}
                      </div>
                      <div className="flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        Add — {pt.startTime} – {pt.endTime}
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={pt.period}
                    type="button"
                    onClick={() => onSlotClick(day, pt.period, slot)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 text-left cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all',
                      subjectColors[getSubjectId(slot)] || 'bg-muted',
                      current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/50 text-xs font-bold dark:bg-black/20">
                      P{pt.period}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{getSubjectName(slot)}</p>
                        {current && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                            Now
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-80 truncate">
                        {getClassName(slot) ? `${getClassName(slot)} · ` : ''}
                        {slot.room ? `${slot.room} · ` : ''}
                        {pt.startTime} – {pt.endTime}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/timetable/TimetableMobileView.tsx
git commit -m "feat(timetable): add interactive TimetableMobileView component"
```

---

## Task 9: Rewrite teacher timetable page

**Files:**
- Rewrite: `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx`

- [ ] **Step 1: Rewrite the page as a thin orchestrator**

Replace the entire contents of `src/app/(dashboard)/teacher/timetable/page.tsx`:

```tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Calendar, Settings } from 'lucide-react';
import { useTeacherTimetableManager } from '@/hooks/useTeacherTimetableManager';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { PeriodConfigDialog } from '@/components/timetable/PeriodConfigDialog';
import { TimetableSlotDialog } from '@/components/timetable/TimetableSlotDialog';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { TimetableMobileView } from '@/components/timetable/TimetableMobileView';
import type { TimetableSlot } from '@/types';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface SlotDialogState {
  open: boolean;
  day: DayOfWeek;
  period: number;
  slot: TimetableSlot | null;
}

export default function TeacherTimetablePage() {
  const {
    timetable, loading, config, configLoading, hasConfig,
    saveConfig, createSlot, updateSlot, deleteSlot,
  } = useTeacherTimetableManager();

  const { subjects } = useTeacherSubjects();
  const { classes } = useTeacherClasses();

  const [configOpen, setConfigOpen] = useState(false);
  const [slotDialog, setSlotDialog] = useState<SlotDialogState>({
    open: false, day: 'monday', period: 1, slot: null,
  });

  // Clock for "Now" indicator — refreshes every minute
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleSlotClick = useCallback(
    (day: DayOfWeek, period: number, slot: TimetableSlot | null) => {
      setSlotDialog({ open: true, day, period, slot });
    },
    [],
  );

  const hasOrphanedSlots = useCallback(
    (periodCount: number) => timetable.some((s) => s.period > periodCount),
    [timetable],
  );

  const periodTimes = useMemo(() => config?.periodTimes ?? [], [config]);

  // Loading
  if (loading || configLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <TableSkeleton rows={7} columns={6} />
      </div>
    );
  }

  // No config — first-time setup
  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState
          icon={Calendar}
          title="Set up your school day"
          description="Configure your periods and times to get started with your timetable."
        >
          <Button onClick={() => setConfigOpen(true)}>Configure Periods</Button>
        </EmptyState>
        <PeriodConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          config={config}
          onSave={saveConfig}
        />
      </div>
    );
  }

  // Main timetable view
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timetable"
        description="Your weekly teaching schedule"
      >
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Period Settings
        </Button>
      </PageHeader>

      <TimetableGrid
        timetable={timetable}
        periodTimes={periodTimes}
        now={now}
        onSlotClick={handleSlotClick}
      />

      <TimetableMobileView
        timetable={timetable}
        periodTimes={periodTimes}
        now={now}
        onSlotClick={handleSlotClick}
      />

      <PeriodConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        onSave={saveConfig}
        hasOrphanedSlots={hasOrphanedSlots}
      />

      <TimetableSlotDialog
        open={slotDialog.open}
        onOpenChange={(open) => setSlotDialog((prev) => ({ ...prev, open }))}
        day={slotDialog.day}
        period={slotDialog.period}
        periodTime={periodTimes.find((pt) => pt.period === slotDialog.period)}
        subjects={subjects}
        classes={classes}
        existingSlot={slotDialog.slot}
        onCreate={createSlot}
        onUpdate={updateSlot}
        onDelete={deleteSlot}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Expected: No errors

- [ ] **Step 3: Verify the page renders in dev**

Run: `cd /c/Users/shaun/campusly-frontend && npx next build`
Expected: Build succeeds with no errors on the timetable page

- [ ] **Step 4: Commit**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/timetable/page.tsx
git commit -m "feat(timetable): rewrite teacher timetable page with self-managed CRUD"
```

---

## Task 10: Verify `PageHeader` supports children for action buttons

**Files:**
- Check: `campusly-frontend/src/components/shared/PageHeader.tsx`

- [ ] **Step 1: Verify PageHeader accepts children**

Read `src/components/shared/PageHeader.tsx` and check if the component accepts `children` as a prop for rendering action buttons in the header. If it does, no changes needed.

If it does NOT accept children, add it:

```tsx
// Add children to the props interface
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

// Render children in the header flex container
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit (only if changes were made)**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/shared/PageHeader.tsx
git commit -m "feat(shared): add children support to PageHeader for action buttons"
```

---

## Task 11: Verify `EmptyState` supports children for CTA buttons

**Files:**
- Check: `campusly-frontend/src/components/shared/EmptyState.tsx`

- [ ] **Step 1: Verify EmptyState accepts children**

Read `src/components/shared/EmptyState.tsx` and check if it accepts `children` for rendering CTA buttons below the description. If it does, no changes needed.

If it does NOT accept children, add support by adding `children?: React.ReactNode` to the props and rendering `{children && <div className="mt-4">{children}</div>}` after the description paragraph.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
cd /c/Users/shaun/campusly-frontend
git add src/components/shared/EmptyState.tsx
git commit -m "feat(shared): add children support to EmptyState for CTA buttons"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Start the backend**

Run: `cd /c/Users/shaun/campusly-backend && npm run dev`
Expected: Server starts on port 4500

- [ ] **Step 2: Start the frontend**

Run: `cd /c/Users/shaun/campusly-frontend && npm run dev`
Expected: Dev server starts on port 3500

- [ ] **Step 3: Manual smoke test checklist**

Test in browser at `http://localhost:3500/teacher/timetable`:

1. As a standalone teacher with no config:
   - Page shows "Set up your school day" empty state
   - Click "Configure Periods" → dialog opens with defaults (7 periods, 07:30 start)
   - Adjust period count and times → Save → grid appears (empty)

2. Adding a slot:
   - Click "+" on a free cell → dialog opens with day/period pre-filled
   - Select subject and class → Save → cell populated with subject info

3. Editing a slot:
   - Click populated cell → dialog opens with current values
   - Change subject → Save → cell updates

4. Deleting a slot:
   - Click populated cell → click "Remove" → cell returns to "+"

5. Period settings:
   - Click "Period Settings" button in header → config dialog opens with current values
   - Modify and save

6. Mobile view:
   - Resize to mobile width → card layout appears with same click behavior

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
cd /c/Users/shaun/campusly-frontend
git add -A
git commit -m "fix(timetable): address smoke test findings"
```
