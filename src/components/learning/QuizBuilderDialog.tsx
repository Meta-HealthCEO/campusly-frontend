'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { Subject, SchoolClass } from '@/types';
import type { CreateQuizInput, QuizQuestion, QuizOption } from './types';
import { QuestionsList } from './QuestionsList';

interface QuizBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  classes: SchoolClass[];
  schoolId: string;
  onSubmit: (data: CreateQuizInput) => Promise<void>;
}

function emptyOption(): QuizOption { return { text: '', isCorrect: false }; }
function emptyQuestion(): QuizQuestion {
  return { questionText: '', questionType: 'mcq', options: [emptyOption(), emptyOption()], correctAnswer: '', points: 1, explanation: '' };
}

export function QuizBuilderDialog({
  open, onOpenChange, subjects, classes, schoolId, onSubmit,
}: QuizBuilderDialogProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [quizType, setQuizType] = useState<'mcq' | 'true_false' | 'mixed'>('mcq');
  const [timeLimit, setTimeLimit] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [dueDate, setDueDate] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [allowRetry, setAllowRetry] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const resetForm = () => {
    setStep(1); setTitle(''); setDescription(''); setSubjectId(''); setClassId('');
    setQuizType('mcq'); setTimeLimit(''); setMaxAttempts('1'); setDueDate('');
    setShuffleQuestions(false); setShuffleOptions(false);
    setShowInstantFeedback(false); setAllowRetry(false); setQuestions([emptyQuestion()]);
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const updateOption = (qIdx: number, oIdx: number, patch: Partial<QuizOption>) => {
    setQuestions((prev) => prev.map((q, qi) =>
      qi === qIdx ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? { ...o, ...patch } : o)) } : q));
  };
  const setCorrectOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => prev.map((q, qi) =>
      qi === qIdx ? { ...q, options: q.options.map((o, oi) => ({ ...o, isCorrect: oi === oIdx })), correctAnswer: q.options[oIdx]?.text ?? '' } : q));
  };
  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx));
  const addOption = (qIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, emptyOption()] } : q)));
  };
  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, oi) => oi !== oIdx) } : q));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        schoolId, subjectId, classId, title, description: description || undefined,
        type: quizType, questions, totalPoints,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
        showInstantFeedback, allowRetry,
        attempts: Number(maxAttempts) || 1, shuffleQuestions, shuffleOptions,
        dueDate: dueDate || undefined,
      });
      resetForm(); onOpenChange(false);
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create Quiz {step === 2 ? '- Questions' : step === 3 ? '- Review' : ''}</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Review" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Subject *</Label>
                  <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Class *</Label>
                  <Select value={classId} onValueChange={(v: unknown) => setClassId(v as string)}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Quiz Type *</Label>
                  <Select value={quizType} onValueChange={(v: unknown) => setQuizType(v as 'mcq' | 'true_false' | 'mixed')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="true_false">True/False</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Time Limit (min)</Label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="20" /></div>
                <div className="space-y-2"><Label>Max Attempts</Label><Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="1" /></div>
              </div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2"><Checkbox id="shuffle" checked={shuffleQuestions} onCheckedChange={(c) => setShuffleQuestions(c === true)} /><Label htmlFor="shuffle">Shuffle questions</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="shuffleOpts" checked={shuffleOptions} onCheckedChange={(c) => setShuffleOptions(c === true)} /><Label htmlFor="shuffleOpts">Shuffle options</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="feedback" checked={showInstantFeedback} onCheckedChange={(c) => setShowInstantFeedback(c === true)} /><Label htmlFor="feedback">Instant feedback</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="retry" checked={allowRetry} onCheckedChange={(c) => setAllowRetry(c === true)} /><Label htmlFor="retry">Allow retry</Label></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <QuestionsList
              questions={questions} onUpdate={updateQuestion} onUpdateOption={updateOption}
              onSetCorrect={setCorrectOption} onAdd={addQuestion} onRemove={removeQuestion}
              onAddOption={addOption} onRemoveOption={removeOption}
            />
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p><strong>Title:</strong> {title}</p>
              <p><strong>Questions:</strong> {questions.length}</p>
              <p><strong>Total Points:</strong> {totalPoints}</p>
              <p><strong>Time Limit:</strong> {timeLimit ? `${timeLimit} min` : 'None'}</p>
              {questions.map((q, i) => (
                <div key={i} className="rounded border p-3 text-sm">
                  <p className="font-medium">Q{i + 1}: {q.questionText} ({q.points} pts)</p>
                  {q.options.map((o, oi) => (
                    <p key={oi} className={o.isCorrect ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                      {String.fromCharCode(65 + oi)}. {o.text} {o.isCorrect ? '(correct)' : ''}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          {step < 3 && <Button type="button" onClick={() => setStep(step + 1)} disabled={step === 1 && (!title || !subjectId || !classId)}>Next</Button>}
          {step === 3 && <Button type="button" onClick={handleSubmit} disabled={submitting || questions.length === 0}>{submitting ? 'Creating...' : 'Create Quiz'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
