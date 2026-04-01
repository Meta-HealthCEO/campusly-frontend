'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BankQuestion,
  CurriculumFramework,
  CurriculumTopic,
  Subject,
  MCQOption,
} from '@/types';

interface QuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: BankQuestion;
  frameworks: CurriculumFramework[];
  subjects: Subject[];
  topics: CurriculumTopic[];
}

interface FormState {
  questionText: string;
  questionType: string;
  marks: string;
  difficulty: string;
  cognitiveLevel: string;
  frameworkId: string;
  subjectId: string;
  gradeLevel: string;
  topicId: string;
  modelAnswer: string;
  markingNotes: string;
  tags: string;
  images: string[];
  options: MCQOption[];
}

const DEFAULTS: FormState = {
  questionText: '',
  questionType: 'structured',
  marks: '1',
  difficulty: 'medium',
  cognitiveLevel: 'knowledge',
  frameworkId: '',
  subjectId: '',
  gradeLevel: '',
  topicId: '',
  modelAnswer: '',
  markingNotes: '',
  tags: '',
  images: [],
  options: [
    { label: 'A', text: '', isCorrect: false },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false },
  ],
};

const TYPES = ['mcq', 'structured', 'essay', 'true_false', 'matching', 'short_answer', 'fill_in_blank'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const COGNITIVE_LEVELS = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'];
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

function cap(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

export function QuestionForm({ open, onOpenChange, onSubmit, initialData, frameworks, subjects, topics }: QuestionFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          questionText: initialData.questionText,
          questionType: initialData.type,
          marks: String(initialData.totalMarks),
          difficulty: initialData.difficulty,
          cognitiveLevel: initialData.cognitiveLevel,
          frameworkId: '',
          subjectId: initialData.subjectId,
          gradeLevel: initialData.gradeId,
          topicId: initialData.topicId ?? '',
          modelAnswer: initialData.correctAnswer ?? '',
          markingNotes: '',
          tags: initialData.tags.join(', '),
          images: [],
          options: initialData.options ?? DEFAULTS.options,
        });
      } else {
        setForm(DEFAULTS);
      }
    }
  }, [open, initialData]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setOption(index: number, field: keyof MCQOption, value: string | boolean) {
    setForm((f) => {
      const options = f.options.map((o, i) =>
        i === index ? { ...o, [field]: value } : o,
      );
      return { ...f, options };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      questionText: form.questionText,
      type: form.questionType,
      totalMarks: Number(form.marks),
      difficulty: form.difficulty,
      cognitiveLevel: form.cognitiveLevel,
      frameworkId: form.frameworkId || undefined,
      subjectId: form.subjectId,
      gradeId: form.gradeLevel,
      topicId: form.topicId || undefined,
      correctAnswer: form.modelAnswer || undefined,
      markingNotes: form.markingNotes || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      images: form.images.filter(Boolean),
    };
    if (form.questionType === 'mcq') {
      payload.options = form.options;
    }
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Question Text */}
            <div className="space-y-1">
              <Label htmlFor="questionText">Question <span className="text-destructive">*</span></Label>
              <Textarea
                id="questionText"
                value={form.questionText}
                onChange={(e) => set('questionText', e.target.value)}
                placeholder="Enter question text..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={form.questionType} onValueChange={(v: unknown) => set('questionType', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{cap(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="marks">Marks <span className="text-destructive">*</span></Label>
                <Input id="marks" type="number" min={1} max={100} value={form.marks} onChange={(e) => set('marks', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Difficulty <span className="text-destructive">*</span></Label>
                <Select value={form.difficulty} onValueChange={(v: unknown) => set('difficulty', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{cap(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cognitive Level <span className="text-destructive">*</span></Label>
                <Select value={form.cognitiveLevel} onValueChange={(v: unknown) => set('cognitiveLevel', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COGNITIVE_LEVELS.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select value={form.subjectId} onValueChange={(v: unknown) => set('subjectId', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select value={form.gradeLevel} onValueChange={(v: unknown) => set('gradeLevel', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Framework</Label>
                <Select value={form.frameworkId || 'none'} onValueChange={(v: unknown) => set('frameworkId', v === 'none' ? '' : v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select framework" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {frameworks.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Topic</Label>
                <Select value={form.topicId || 'none'} onValueChange={(v: unknown) => set('topicId', v === 'none' ? '' : v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MCQ Options */}
            {form.questionType === 'mcq' && (
              <div className="space-y-2">
                <Label>Options</Label>
                {form.options.map((opt, i) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <span className="w-5 text-sm font-medium shrink-0">{opt.label}.</span>
                    <Input
                      value={opt.text}
                      onChange={(e) => setOption(i, 'text', e.target.value)}
                      placeholder={`Option ${opt.label}`}
                      className="flex-1"
                    />
                    <Checkbox
                      checked={opt.isCorrect}
                      onCheckedChange={(v) => setOption(i, 'isCorrect', Boolean(v))}
                      aria-label="Correct answer"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="modelAnswer">Model Answer</Label>
              <Textarea id="modelAnswer" value={form.modelAnswer} onChange={(e) => set('modelAnswer', e.target.value)} placeholder="Expected answer..." rows={2} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="markingNotes">Marking Notes</Label>
              <Textarea id="markingNotes" value={form.markingNotes} onChange={(e) => set('markingNotes', e.target.value)} placeholder="Notes for markers..." rows={2} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. algebra, equations, grade10" />
            </div>

            {/* Image URLs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Images (URLs)</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => set('images', [...form.images, ''])}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {form.images.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={url} onChange={(e) => { const imgs = [...form.images]; imgs[i] = e.target.value; set('images', imgs); }} placeholder="https://..." className="flex-1" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
