'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { OptionsEditor } from './OptionsEditor';
import { QUESTION_TYPES, CAPS_LEVELS, BLOOMS_LEVELS } from './question-constants';
import type {
  QuestionItem,
  QuestionType,
  CapsLevel,
  BloomsLevel,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  QuestionOption,
} from '@/types/question-bank';

// ─── Form Shape ─────────────────────────────────────────────────────────────

interface FormValues {
  stem: string;
  type: QuestionType;
  marks: number;
  capsLevel: CapsLevel;
  bloomsLevel: BloomsLevel;
  difficulty: number;
  options: QuestionOption[];
  answer: string;
  markingRubric: string;
  tagsRaw: string;
  subjectId: string;
  gradeId: string;
}

const DEFAULTS: FormValues = {
  stem: '',
  type: 'mcq',
  marks: 1,
  capsLevel: 'knowledge',
  bloomsLevel: 'remember',
  difficulty: 1,
  options: [],
  answer: '',
  markingRubric: '',
  tagsRaw: '',
  subjectId: '',
  gradeId: '',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface SelectOption {
  id: string;
  name: string;
}

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitCreate: (payload: CreateQuestionPayload) => Promise<void>;
  onSubmitUpdate: (id: string, payload: UpdateQuestionPayload) => Promise<void>;
  editingQuestion: QuestionItem | null;
  subjects: SelectOption[];
  grades: SelectOption[];
  selectedNodeId?: string;
  selectedNodeTitle?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuestionFormDialog({
  open,
  onOpenChange,
  onSubmitCreate,
  onSubmitUpdate,
  editingQuestion,
  subjects,
  grades,
  selectedNodeId,
  selectedNodeTitle,
}: QuestionFormDialogProps) {
  const {
    register, handleSubmit, setValue, watch, reset, control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const selectedType = watch('type');
  const showOptions = selectedType === 'mcq' || selectedType === 'true_false';

  useEffect(() => {
    if (!open) return;
    if (editingQuestion) {
      reset({
        stem: editingQuestion.stem,
        type: editingQuestion.type,
        marks: editingQuestion.marks,
        capsLevel: editingQuestion.cognitiveLevel.caps,
        bloomsLevel: editingQuestion.cognitiveLevel.blooms,
        difficulty: editingQuestion.difficulty,
        options: editingQuestion.options,
        answer: editingQuestion.answer,
        markingRubric: editingQuestion.markingRubric,
        tagsRaw: editingQuestion.tags.join(', '),
        subjectId: typeof editingQuestion.subjectId === 'string'
          ? editingQuestion.subjectId : editingQuestion.subjectId.id,
        gradeId: typeof editingQuestion.gradeId === 'string'
          ? editingQuestion.gradeId : editingQuestion.gradeId.id,
      });
    } else {
      reset(DEFAULTS);
    }
  }, [open, editingQuestion, reset]);

  const onSubmit = async (data: FormValues) => {
    const tags = data.tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean);
    const payload: CreateQuestionPayload = {
      curriculumNodeId: selectedNodeId ?? '',
      subjectId: data.subjectId,
      gradeId: data.gradeId,
      type: data.type,
      stem: data.stem,
      marks: data.marks,
      cognitiveLevel: { caps: data.capsLevel, blooms: data.bloomsLevel },
      difficulty: data.difficulty,
      options: showOptions ? data.options : undefined,
      answer: data.answer || undefined,
      markingRubric: data.markingRubric || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
    if (editingQuestion) {
      await onSubmitUpdate(editingQuestion.id, payload);
    } else {
      await onSubmitCreate(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create Question'}</DialogTitle>
          <DialogDescription>
            {selectedNodeTitle
              ? `Curriculum node: ${selectedNodeTitle}`
              : 'Fill in the question details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Stem */}
            <div>
              <Label htmlFor="q-stem">Question Stem <span className="text-destructive">*</span></Label>
              <Textarea id="q-stem" rows={4} placeholder="Enter the question..." {...register('stem', { required: true })} />
            </div>

            {/* Type + Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={selectedType} onValueChange={(v: unknown) => setValue('type', v as QuestionType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((qt) => (
                      <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="q-marks">Marks <span className="text-destructive">*</span></Label>
                <Input id="q-marks" type="number" min={1} {...register('marks', { required: true, valueAsNumber: true })} />
              </div>
            </div>

            {/* Cognitive levels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>CAPS Level</Label>
                <Select value={watch('capsLevel')} onValueChange={(v: unknown) => setValue('capsLevel', v as CapsLevel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPS_LEVELS.map((cl) => (
                      <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blooms Level</Label>
                <Select value={watch('bloomsLevel')} onValueChange={(v: unknown) => setValue('bloomsLevel', v as BloomsLevel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOOMS_LEVELS.map((bl) => (
                      <SelectItem key={bl.value} value={bl.value}>{bl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <Label htmlFor="q-diff">Difficulty (1-5)</Label>
              <Input id="q-diff" type="number" min={1} max={5} {...register('difficulty', { required: true, valueAsNumber: true })} />
            </div>

            {/* Subject + Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Select value={watch('subjectId')} onValueChange={(v: unknown) => setValue('subjectId', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={watch('gradeId')} onValueChange={(v: unknown) => setValue('gradeId', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options editor for MCQ / True-False */}
            {showOptions && (
              <OptionsEditor
                fields={fields as unknown as QuestionOption[]}
                onAppend={() => append({ label: '', text: '', isCorrect: false })}
                onRemove={remove}
                onLabelChange={(i: number, val: string) => setValue(`options.${i}.label`, val)}
                onTextChange={(i: number, val: string) => setValue(`options.${i}.text`, val)}
                onCorrectChange={(i: number, val: boolean) => setValue(`options.${i}.isCorrect`, val)}
              />
            )}

            {/* Answer */}
            <div>
              <Label htmlFor="q-answer">Answer / Model Answer</Label>
              <Textarea id="q-answer" rows={3} {...register('answer')} />
            </div>

            {/* Marking rubric */}
            <div>
              <Label htmlFor="q-rubric">Marking Rubric</Label>
              <Textarea id="q-rubric" rows={3} {...register('markingRubric')} />
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="q-tags">Tags (comma-separated)</Label>
              <Input id="q-tags" placeholder="algebra, term1" {...register('tagsRaw')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingQuestion ? 'Update Question' : 'Create Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
