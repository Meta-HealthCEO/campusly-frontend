'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { QuestionEditor } from './QuestionEditor';
import type { CreateSurveyPayload, SurveyQuestion } from '@/types';

interface SurveyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSurveyPayload) => Promise<void>;
}

const DEFAULT_QUESTION: SurveyQuestion = {
  text: '', type: 'scale', scaleMin: 1, scaleMax: 5, required: true,
};

export function SurveyBuilder({ open, onOpenChange, onSubmit }: SurveyBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [targetGrades, setTargetGrades] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([{ ...DEFAULT_QUESTION }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setIsAnonymous(true);
      setTargetGrades('');
      setStartDate('');
      setEndDate('');
      setQuestions([{ ...DEFAULT_QUESTION }]);
    }
  }, [open]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...DEFAULT_QUESTION }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, updated: SurveyQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !endDate || questions.length === 0) return;
    const grades = targetGrades.split(',').map((g) => Number(g.trim())).filter(Boolean);
    if (grades.length === 0) return;

    try {
      setSubmitting(true);
      await onSubmit({
        title, description: description || undefined,
        isAnonymous, targetGrades: grades,
        startDate, endDate, questions,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to create survey', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Wellbeing Survey</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Target Grades (comma-separated) <span className="text-destructive">*</span></Label>
            <Input value={targetGrades} onChange={(e) => setTargetGrades(e.target.value)}
              placeholder="8,9,10,11,12" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            <Label>Anonymous responses</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Questions</Label>
              <Button variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {questions.map((q, idx) => (
              <div key={idx} className="relative border rounded-lg p-3">
                <QuestionEditor
                  question={q}
                  onChange={(updated) => updateQuestion(idx, updated)}
                />
                {questions.length > 1 && (
                  <Button
                    variant="ghost" size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeQuestion(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !title || !startDate}>
            {submitting ? 'Creating...' : 'Create Survey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
