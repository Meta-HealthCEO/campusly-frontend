'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OptionsEditor } from './OptionsEditor';
import { AIGenerateButton } from './AIGenerateButton';
import { QUESTION_TYPES, CAPS_LEVELS } from './question-constants';
import { DIFFICULTY_LEVELS_SIMPLE } from '@/lib/design-system';
import type {
  QuestionItem, QuestionType, CapsLevel, BloomsLevel,
  CreateQuestionPayload, UpdateQuestionPayload, QuestionOption, GenerateQuestionsPayload,
} from '@/types/question-bank';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOMS_DEFAULT: BloomsLevel = 'remember';

const SUBJECT_MAP: Record<string, string[]> = {
  MATHEMATICS: ['Mathematics', 'Maths'],
  MATHLIT: ['Mathematical Literacy', 'Maths Lit'],
  LIFESCI: ['Life Sciences', 'Life Science'],
  PHYSSCI: ['Physical Sciences', 'Physical Science'],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectOption { id: string; name: string; }

interface FormValues {
  stem: string; type: QuestionType; marks: number; capsLevel: CapsLevel;
  difficulty: number; options: QuestionOption[]; answer: string;
  markingRubric: string; tagsRaw: string; subjectId: string; gradeId: string;
}

const DEFAULTS: FormValues = {
  stem: '', type: 'mcq', marks: 1, capsLevel: 'knowledge', difficulty: 3,
  options: [], answer: '', markingRubric: '', tagsRaw: '', subjectId: '', gradeId: '',
};

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
  selectedNodeCode?: string;
  onGenerateQuestion: (payload: GenerateQuestionsPayload) => Promise<QuestionItem[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectSubjectId(code: string | undefined, subjects: SelectOption[]): string {
  if (!code) return '';
  const part = code.split('-')[1];
  if (!part) return '';
  const keywords = SUBJECT_MAP[part] ?? [part];
  return subjects.find((s) => keywords.some((kw) => s.name.toLowerCase().includes(kw.toLowerCase())))?.id ?? '';
}

function detectGradeId(code: string | undefined, grades: SelectOption[]): string {
  if (!code) return '';
  const match = code.match(/GR(\d+)/);
  return match ? (grades.find((g) => g.name.includes(match[1]))?.id ?? '') : '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionFormDialog({
  open, onOpenChange, onSubmitCreate, onSubmitUpdate,
  editingQuestion, subjects, grades,
  selectedNodeId, selectedNodeTitle, selectedNodeCode,
  onGenerateQuestion,
}: QuestionFormDialogProps) {
  const {
    register, handleSubmit, setValue, watch, reset, control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'options' });
  const selectedType = watch('type');
  const capsLevel = watch('capsLevel');
  const difficulty = watch('difficulty');
  const subjectId = watch('subjectId');
  const gradeId = watch('gradeId');
  const showOptions = selectedType === 'mcq' || selectedType === 'true_false';

  const autoSubjectId = useMemo(() => detectSubjectId(selectedNodeCode, subjects), [selectedNodeCode, subjects]);
  const autoGradeId = useMemo(() => detectGradeId(selectedNodeCode, grades), [selectedNodeCode, grades]);
  const isAutoDetected = Boolean(selectedNodeId && (autoSubjectId || autoGradeId));
  const autoSubjectName = useMemo(() => subjects.find((s) => s.id === autoSubjectId)?.name ?? '', [autoSubjectId, subjects]);
  const autoGradeName = useMemo(() => grades.find((g) => g.id === autoGradeId)?.name ?? '', [autoGradeId, grades]);

  useEffect(() => {
    if (!open) return;
    if (editingQuestion) {
      reset({
        stem: editingQuestion.stem, type: editingQuestion.type, marks: editingQuestion.marks,
        capsLevel: editingQuestion.cognitiveLevel.caps, difficulty: editingQuestion.difficulty,
        options: editingQuestion.options, answer: editingQuestion.answer,
        markingRubric: editingQuestion.markingRubric, tagsRaw: editingQuestion.tags.join(', '),
        subjectId: typeof editingQuestion.subjectId === 'string' ? editingQuestion.subjectId : editingQuestion.subjectId.id,
        gradeId: typeof editingQuestion.gradeId === 'string' ? editingQuestion.gradeId : editingQuestion.gradeId.id,
      });
    } else {
      reset({ ...DEFAULTS, subjectId: autoSubjectId, gradeId: autoGradeId });
    }
  }, [open, editingQuestion, reset, autoSubjectId, autoGradeId]);

  const onSubmit = async (data: FormValues) => {
    const tags = data.tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean);
    const useAuto = isAutoDetected && !editingQuestion;
    const payload: CreateQuestionPayload = {
      curriculumNodeId: selectedNodeId ?? '',
      subjectId: useAuto ? autoSubjectId : data.subjectId,
      gradeId: useAuto ? autoGradeId : data.gradeId,
      type: data.type, stem: data.stem, marks: data.marks,
      cognitiveLevel: { caps: data.capsLevel, blooms: BLOOMS_DEFAULT },
      difficulty: data.difficulty,
      options: showOptions ? data.options : undefined,
      answer: data.answer || undefined,
      markingRubric: data.markingRubric || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
    if (editingQuestion) await onSubmitUpdate(editingQuestion.id, payload);
    else await onSubmitCreate(payload);
    onOpenChange(false);
  };

  const effSubjectId = isAutoDetected && !editingQuestion ? autoSubjectId : subjectId;
  const effGradeId = isAutoDetected && !editingQuestion ? autoGradeId : gradeId;
  const aiSubjectId = isAutoDetected ? autoSubjectId : subjectId;
  const aiGradeId = isAutoDetected ? autoGradeId : gradeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingQuestion ? 'Edit Question' : 'New Question'}</DialogTitle>
          <DialogDescription>
            {selectedNodeTitle
              ? `Tagged to: ${selectedNodeTitle}`
              : 'Select a curriculum node on the page to enable AI generation and CAPS alignment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">

            {/* Question stem + AI button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label htmlFor="q-stem" className="font-semibold">
                  Question <span className="text-destructive">*</span>
                </Label>
                <AIGenerateButton
                  curriculumNodeId={selectedNodeId}
                  subjectId={aiSubjectId} gradeId={aiGradeId}
                  type={selectedType} capsLevel={capsLevel}
                  bloomsLevel={BLOOMS_DEFAULT} difficulty={difficulty}
                  onFilled={(f) => {
                    setValue('stem', f.stem);
                    setValue('answer', f.answer);
                    setValue('markingRubric', f.markingRubric);
                    if (f.marks > 0) setValue('marks', f.marks);
                    if (f.options.length > 0) replace(f.options);
                  }}
                  onGenerate={onGenerateQuestion}
                />
              </div>
              <Textarea id="q-stem" rows={4} placeholder="Enter the question..."
                {...register('stem', { required: true })} />
            </div>

            {/* Classification */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classification</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Type <span className="text-destructive">*</span></Label>
                  <Select value={selectedType} onValueChange={(v: unknown) => setValue('type', v as QuestionType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{QUESTION_TYPES.find((qt) => qt.value === selectedType)?.label ?? 'Select type'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((qt) => <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CAPS Level</Label>
                  <Select value={capsLevel} onValueChange={(v: unknown) => setValue('capsLevel', v as CapsLevel)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{CAPS_LEVELS.find((cl) => cl.value === capsLevel)?.label ?? 'Select level'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CAPS_LEVELS.map((cl) => <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="q-marks">Marks <span className="text-destructive">*</span></Label>
                  <Input id="q-marks" type="number" min={1}
                    {...register('marks', { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <Label className="text-sm">Difficulty</Label>
                <div className="flex gap-2 mt-1">
                  {DIFFICULTY_LEVELS_SIMPLE.map((d) => (
                    <button key={d.value} type="button" onClick={() => setValue('difficulty', d.value)}
                      className={cn('flex-1 rounded-lg border-2 py-2 text-xs font-medium transition-all',
                        difficulty === d.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-muted/40 hover:bg-muted/60')}>
                      <span className={cn('inline-block size-2 rounded-full mr-1.5', d.dot)} />{d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Answer</p>
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
              <div>
                <Label htmlFor="q-answer">{showOptions ? 'Model Answer / Explanation' : 'Answer'}</Label>
                <Textarea id="q-answer" rows={3} {...register('answer')} />
              </div>
              <div>
                <Label htmlFor="q-rubric">Marking Rubric</Label>
                <Textarea id="q-rubric" rows={2} {...register('markingRubric')} />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metadata</p>
              {isAutoDetected && !editingQuestion ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Auto-detected:</span>
                  {autoSubjectName && <Badge variant="secondary" className="text-xs">{autoSubjectName}</Badge>}
                  {autoGradeName && <Badge variant="secondary" className="text-xs">{autoGradeName}</Badge>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Select value={effSubjectId} onValueChange={(v: unknown) => setValue('subjectId', v as string)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subject">
                          {subjects.find((s) => s.id === effSubjectId)?.name ?? 'Select subject'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Grade</Label>
                    <Select value={effGradeId} onValueChange={(v: unknown) => setValue('gradeId', v as string)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select grade">
                          {grades.find((g) => g.id === effGradeId)?.name ?? 'Select grade'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {!selectedNodeId && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  Tip: Select a curriculum topic to tag this question for CAPS alignment and enable AI generation.
                </p>
              )}
              <div>
                <Label htmlFor="q-tags">Tags (comma-separated)</Label>
                <Input id="q-tags" placeholder="algebra, term1" {...register('tagsRaw')} />
              </div>
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
