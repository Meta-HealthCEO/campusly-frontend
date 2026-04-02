'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subject, GeneratePracticePayload } from '@/types';

interface PracticeSetupProps {
  onGenerate: (payload: GeneratePracticePayload) => void;
  generating: boolean;
  subjects: Subject[];
  grade: number;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type QuestionType = 'mcq' | 'short_answer' | 'true_false';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

const Q_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'true_false', label: 'True / False' },
];

export function PracticeSetup({ onGenerate, generating, subjects, grade }: PracticeSetupProps) {
  const [subjectId, setSubjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq']);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const toggleType = (t: QuestionType, checked: boolean) => {
    setQuestionTypes((prev) =>
      checked ? [...prev, t] : prev.filter((x) => x !== t),
    );
  };

  const handleGenerate = () => {
    if (!subjectId || !topic.trim()) return;
    onGenerate({
      subjectId,
      subjectName: selectedSubject?.name ?? '',
      grade,
      topic: topic.trim(),
      questionCount,
      difficulty,
      questionTypes: questionTypes.length > 0 ? questionTypes : ['mcq'],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Practice Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}>
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
          <div className="space-y-1.5">
            <Label>Topic <span className="text-destructive">*</span></Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quadratic equations"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v: unknown) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Number of Questions</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value) || 5)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question Types</Label>
          <div className="flex flex-wrap gap-4">
            {Q_TYPES.map((qt) => (
              <label key={qt.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={questionTypes.includes(qt.value)}
                  onCheckedChange={(checked: boolean) => toggleType(qt.value, checked)}
                />
                {qt.label}
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating || !subjectId || !topic.trim()}
          className="w-full sm:w-auto"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Generate Practice</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
