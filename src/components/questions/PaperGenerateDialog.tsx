'use client';

import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PaperType, GeneratePaperPayload } from '@/types/question-bank';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: 'class_test', label: 'Class Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'mid_year', label: 'Mid-Year' },
  { value: 'trial', label: 'Trial' },
  { value: 'final', label: 'Final' },
  { value: 'custom', label: 'Custom' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'challenging', label: 'Challenging' },
] as const;

interface FormValues {
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  totalMarks: number;
  duration: number;
  difficulty: 'easy' | 'balanced' | 'challenging';
  instructions: string;
}

const DEFAULTS: FormValues = {
  subjectId: '',
  gradeId: '',
  term: 1,
  year: new Date().getFullYear(),
  paperType: 'class_test',
  totalMarks: 100,
  duration: 60,
  difficulty: 'balanced',
  instructions: '',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface SubjectOption { id: string; name: string }
interface GradeOption { id: string; name: string }

interface PaperGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: SubjectOption[];
  grades: GradeOption[];
  onGenerate: (payload: GeneratePaperPayload) => Promise<{ id: string } | null>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PaperGenerateDialog({
  open,
  onOpenChange,
  subjects,
  grades,
  onGenerate,
}: PaperGenerateDialogProps) {
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      const payload: GeneratePaperPayload = {
        subjectId: data.subjectId,
        gradeId: data.gradeId,
        term: data.term,
        year: data.year,
        paperType: data.paperType,
        totalMarks: data.totalMarks,
        duration: data.duration,
        difficulty: data.difficulty,
        instructions: data.instructions || undefined,
      };
      await onGenerate(payload);
    },
    [onGenerate],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            AI Paper Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete assessment paper using AI. Questions are selected from
            the approved question bank.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('subjectId')}
                  onValueChange={(v: unknown) => setValue('subjectId', v as string)}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: SubjectOption) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('gradeId')}
                  onValueChange={(v: unknown) => setValue('gradeId', v as string)}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g: GradeOption) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="gen-term">Term <span className="text-destructive">*</span></Label>
                <Input id="gen-term" type="number" min={1} max={4}
                  {...register('term', { required: true, valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="gen-year">Year <span className="text-destructive">*</span></Label>
                <Input id="gen-year" type="number"
                  {...register('year', { required: true, valueAsNumber: true })} />
              </div>
              <div>
                <Label>Paper Type <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('paperType')}
                  onValueChange={(v: unknown) => setValue('paperType', v as PaperType)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAPER_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="gen-marks">Total Marks <span className="text-destructive">*</span></Label>
                <Input id="gen-marks" type="number" min={1}
                  {...register('totalMarks', { required: true, valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="gen-dur">Duration (min)</Label>
                <Input id="gen-dur" type="number" min={1}
                  {...register('duration', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={watch('difficulty')}
                  onValueChange={(v: unknown) =>
                    setValue('difficulty', v as 'easy' | 'balanced' | 'challenging')
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="gen-inst">Instructions</Label>
              <Textarea id="gen-inst" rows={2} {...register('instructions')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Generating...' : 'Generate Paper'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
