'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { SuggestedTeachersList } from './SuggestedTeachersList';
import type {
  SchoolClass,
  SubstituteTeacher,
  SubstituteReasonCategory,
  SuggestedSubstituteTeacher,
} from '@/types';
import type { CreateSubstitutePayload } from '@/hooks/useSubstitutes';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

const REASON_CATEGORIES: { value: SubstituteReasonCategory; label: string }[] = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'training', label: 'Training' },
  { value: 'personal', label: 'Personal' },
  { value: 'family', label: 'Family' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

const substituteSchema = z.object({
  originalTeacherId: z.string().min(1, 'Original teacher is required'),
  substituteTeacherId: z.string().min(1, 'Substitute teacher is required'),
  date: z.string().min(1, 'Date is required'),
  reasonCategory: z.enum(['sick', 'training', 'personal', 'family', 'emergency', 'other']),
  reason: z.string().optional(),
});

type SubstituteFormValues = z.infer<typeof substituteSchema>;

interface SubstituteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  classes: SchoolClass[];
  maxPeriods?: number;
  initialData?: Partial<SubstituteTeacher> & { leaveRequestId?: string };
  onSubmit: (data: CreateSubstitutePayload) => Promise<void>;
  onFetchSuggestions?: (
    date: string,
    periods: number[],
    originalTeacherId: string,
  ) => Promise<SuggestedSubstituteTeacher[]>;
}

function getId(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const obj = val as { _id?: string; id?: string };
    return obj._id ?? obj.id ?? '';
  }
  return '';
}

function toDateInput(date?: string): string {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SubstituteForm({
  open, onOpenChange, staff, classes,
  maxPeriods = 7, initialData, onSubmit, onFetchSuggestions,
}: SubstituteFormProps) {
  const isEdit = Boolean(initialData?._id);
  const allPeriods = useMemo(
    () => Array.from({ length: maxPeriods }, (_, i) => i + 1),
    [maxPeriods],
  );

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors },
  } = useForm<SubstituteFormValues>({
    resolver: zodResolver(substituteSchema),
    defaultValues: {
      date: toDateInput(),
      reasonCategory: 'sick',
      originalTeacherId: '',
      substituteTeacherId: '',
      reason: '',
    },
  });

  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isFullDay, setIsFullDay] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [classError, setClassError] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedSubstituteTeacher[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const date = watch('date');
  const reasonCategory = watch('reasonCategory');
  const originalTeacherId = watch('originalTeacherId');
  const substituteTeacherId = watch('substituteTeacherId');

  // Reset on open
  useEffect(() => {
    if (!open) return;
    const initDate = toDateInput(initialData?.date);
    reset({
      date: initDate,
      reasonCategory: initialData?.reasonCategory ?? 'sick',
      originalTeacherId: getId(initialData?.originalTeacherId),
      substituteTeacherId: getId(initialData?.substituteTeacherId),
      reason: initialData?.reason ?? '',
    });
    setSelectedPeriods(initialData?.periods ?? []);
    setSelectedClasses(
      initialData?.classIds?.map((c) => getId(c)).filter(Boolean) ?? [],
    );
    setIsFullDay(initialData?.isFullDay ?? false);
    setPeriodError('');
    setClassError('');
    setSuggestions([]);
  }, [open, initialData, reset]);

  // Auto-select all periods when full-day is enabled
  useEffect(() => {
    if (isFullDay) {
      setSelectedPeriods(allPeriods);
      setPeriodError('');
    }
  }, [isFullDay, allPeriods]);

  // Fetch suggestions when key fields change
  useEffect(() => {
    if (!onFetchSuggestions) return;
    if (!date || !originalTeacherId || selectedPeriods.length === 0) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    onFetchSuggestions(date, selectedPeriods, originalTeacherId)
      .then((res) => { if (!cancelled) setSuggestions(res); })
      .finally(() => { if (!cancelled) setSuggestionsLoading(false); });
    return () => { cancelled = true; };
  }, [date, originalTeacherId, selectedPeriods, onFetchSuggestions]);

  const togglePeriod = (p: number) => {
    if (isFullDay) return;
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
    setPeriodError('');
  };

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setClassError('');
  };

  const handleFormSubmit = async (data: SubstituteFormValues) => {
    if (selectedPeriods.length === 0) {
      setPeriodError('At least one period is required');
      return;
    }
    if (selectedClasses.length === 0) {
      setClassError('At least one class is required');
      return;
    }
    const payload: CreateSubstitutePayload = {
      originalTeacherId: data.originalTeacherId,
      substituteTeacherId: data.substituteTeacherId,
      date: new Date(data.date).toISOString(),
      reasonCategory: data.reasonCategory,
      reason: data.reason ?? '',
      isFullDay,
      periods: [...selectedPeriods].sort((a, b) => a - b),
      classIds: selectedClasses,
      ...(initialData?.leaveRequestId ? { leaveRequestId: initialData.leaveRequestId } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Substitute' : 'Assign Substitute Teacher'}</DialogTitle>
        </DialogHeader>
        <form
          id="substitute-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto py-2 space-y-4"
        >
          <div className="space-y-2">
            <Label>Original Teacher <span className="text-destructive">*</span></Label>
            <Select
              value={originalTeacherId}
              onValueChange={(val: unknown) => setValue('originalTeacherId', val as string)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.originalTeacherId && (
              <p className="text-xs text-destructive">{errors.originalTeacherId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-date">Date <span className="text-destructive">*</span></Label>
            <Input id="sub-date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason Category <span className="text-destructive">*</span></Label>
            <Select
              value={reasonCategory}
              onValueChange={(val: unknown) => setValue('reasonCategory', val as SubstituteReasonCategory)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {REASON_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={isFullDay}
                onCheckedChange={(c: boolean) => setIsFullDay(c)}
              />
              Full day (covers all periods)
            </label>
          </div>

          <div className="space-y-2">
            <Label>Periods <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {allPeriods.map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-1.5 text-sm ${isFullDay ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={selectedPeriods.includes(p)}
                    onCheckedChange={() => togglePeriod(p)}
                    disabled={isFullDay}
                  />
                  Period {p}
                </label>
              ))}
            </div>
            {periodError && <p className="text-xs text-destructive">{periodError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Classes <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedClasses.includes(c.id)}
                    onCheckedChange={() => toggleClass(c.id)}
                  />
                  {c.grade?.name ?? c.gradeName ?? ''} {c.name}
                </label>
              ))}
            </div>
            {classError && <p className="text-xs text-destructive">{classError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Substitute Teacher <span className="text-destructive">*</span></Label>
            <Select
              value={substituteTeacherId}
              onValueChange={(val: unknown) => setValue('substituteTeacherId', val as string)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select substitute" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.substituteTeacherId && (
              <p className="text-xs text-destructive">{errors.substituteTeacherId.message}</p>
            )}
            {onFetchSuggestions && (
              <SuggestedTeachersList
                suggestions={suggestions}
                loading={suggestionsLoading}
                onSelect={(id) => setValue('substituteTeacherId', id)}
                selectedId={substituteTeacherId}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Additional details</Label>
            <Textarea id="reason" placeholder="Optional notes" {...register('reason')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="substitute-form">
            {isEdit ? 'Save Changes' : 'Assign Substitute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
