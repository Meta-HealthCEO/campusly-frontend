'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GeneratePaperPayload, PaperType } from '@/types/question-bank';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: 'class_test', label: 'Class Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'mid_year', label: 'Mid-Year Exam' },
  { value: 'trial', label: 'Trial Exam' },
  { value: 'final', label: 'Final Exam' },
  { value: 'custom', label: 'Custom' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'challenging', label: 'Challenging' },
] as const;

// ─── Form Shape ─────────────────────────────────────────────────────────────

interface FormValues {
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  totalMarks: number;
  duration: number;
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
  difficulty: 'easy' | 'balanced' | 'challenging';
  instructions: string;
}

const DEFAULTS: FormValues = {
  subjectId: '',
  gradeId: '',
  term: 1,
  year: new Date().getFullYear(),
  paperType: 'class_test',
  totalMarks: 50,
  duration: 60,
  knowledge: 20,
  routine: 35,
  complex: 30,
  problemSolving: 15,
  difficulty: 'balanced',
  instructions: '',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaperGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: GeneratePaperPayload) => Promise<void>;
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PaperGenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  subjects,
  grades,
}: PaperGenerateDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    const payload: GeneratePaperPayload = {
      subjectId: data.subjectId,
      gradeId: data.gradeId,
      term: data.term,
      year: data.year,
      paperType: data.paperType,
      totalMarks: data.totalMarks,
      duration: data.duration,
      cognitiveWeighting: {
        knowledge: data.knowledge,
        routine: data.routine,
        complex: data.complex,
        problemSolving: data.problemSolving,
      },
      difficulty: data.difficulty,
      instructions: data.instructions || undefined,
    };
    await onGenerate(payload);
    onOpenChange(false);
  };

  const weightTotal = (watch('knowledge') || 0) + (watch('routine') || 0) +
    (watch('complex') || 0) + (watch('problemSolving') || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            Generate Paper with AI
          </DialogTitle>
          <DialogDescription>
            Configure the paper parameters and let AI assemble questions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Subject + Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('subjectId')}
                  onValueChange={(v: unknown) => setValue('subjectId', v as string)}
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
              </div>
              <div>
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('gradeId')}
                  onValueChange={(v: unknown) => setValue('gradeId', v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Term + Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gen-term">Term <span className="text-destructive">*</span></Label>
                <Input
                  id="gen-term"
                  type="number"
                  min={1}
                  max={4}
                  {...register('term', { required: true, valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="gen-year">Year <span className="text-destructive">*</span></Label>
                <Input
                  id="gen-year"
                  type="number"
                  min={2020}
                  max={2040}
                  {...register('year', { required: true, valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Paper type */}
            <div>
              <Label>Paper Type <span className="text-destructive">*</span></Label>
              <Select
                value={watch('paperType')}
                onValueChange={(v: unknown) => setValue('paperType', v as PaperType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total marks + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gen-marks">Total Marks <span className="text-destructive">*</span></Label>
                <Input
                  id="gen-marks"
                  type="number"
                  min={10}
                  {...register('totalMarks', { required: true, valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="gen-duration">Duration (min) <span className="text-destructive">*</span></Label>
                <Input
                  id="gen-duration"
                  type="number"
                  min={10}
                  {...register('duration', { required: true, valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Cognitive weighting */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Cognitive Weighting (%)
                <span className={`ml-2 text-xs ${weightTotal === 100 ? 'text-muted-foreground' : 'text-destructive'}`}>
                  Total: {weightTotal}%
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gen-know" className="text-xs">Knowledge</Label>
                  <Input id="gen-know" type="number" min={0} max={100}
                    {...register('knowledge', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="gen-routine" className="text-xs">Routine</Label>
                  <Input id="gen-routine" type="number" min={0} max={100}
                    {...register('routine', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="gen-complex" className="text-xs">Complex</Label>
                  <Input id="gen-complex" type="number" min={0} max={100}
                    {...register('complex', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="gen-ps" className="text-xs">Problem Solving</Label>
                  <Input id="gen-ps" type="number" min={0} max={100}
                    {...register('problemSolving', { required: true, valueAsNumber: true })} />
                </div>
              </div>
            </fieldset>

            {/* Difficulty */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Difficulty</legend>
              <div className="flex gap-3">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('difficulty')}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Instructions */}
            <div>
              <Label htmlFor="gen-instr">Instructions (optional)</Label>
              <Textarea
                id="gen-instr"
                rows={3}
                placeholder="Additional instructions for the AI..."
                {...register('instructions')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || weightTotal !== 100}>
              {isSubmitting ? 'Generating...' : 'Generate Paper'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
