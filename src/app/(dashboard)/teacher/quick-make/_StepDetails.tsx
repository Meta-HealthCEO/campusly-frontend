'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurriculumGenerationContext } from '@/hooks/useCurriculumPreparation';
import type { PaperDifficulty, PaperType } from '@/types/papers';
import type { BloomsLevel, CapsLevel, QuestionType } from '@/types/question-bank';
import type { ResourceType } from '@/types';
import type { CreationKind } from './_constants';
import {
  RESOURCE_TYPES,
  DIFFICULTIES,
  PAPER_TYPES,
  PAPER_DIFFICULTIES,
  QUESTION_TYPES,
  CAPS_LEVELS,
  BLOOMS_LEVELS,
} from './_constants';

interface Props {
  selectedOutput: CreationKind;
  outputTitle: string | undefined;
  curriculumContext: CurriculumGenerationContext | null;
  term: number;
  resourceType: ResourceType;
  difficulty: number;
  instructions: string;
  paperType: PaperType;
  paperTitle: string;
  paperMarks: number;
  paperDuration: number;
  paperDifficulty: PaperDifficulty;
  paperYear: number;
  computedPaperTitle: string;
  questionType: QuestionType;
  questionCount: number;
  questionCapsLevel: CapsLevel;
  questionBloomsLevel: BloomsLevel;
  canGenerate: boolean;
  onResourceType: (v: ResourceType) => void;
  onDifficulty: (v: number) => void;
  onInstructions: (v: string) => void;
  onPaperType: (v: PaperType) => void;
  onPaperTitle: (v: string) => void;
  onPaperMarks: (v: number) => void;
  onPaperDuration: (v: number) => void;
  onPaperDifficulty: (v: PaperDifficulty) => void;
  onPaperYear: (v: number) => void;
  onQuestionType: (v: QuestionType) => void;
  onQuestionCount: (v: number) => void;
  onQuestionCapsLevel: (v: CapsLevel) => void;
  onQuestionBloomsLevel: (v: BloomsLevel) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepDetails({ selectedOutput, outputTitle, curriculumContext, term, resourceType, difficulty, instructions, paperType, paperTitle, paperMarks, paperDuration, paperDifficulty, paperYear, computedPaperTitle, questionType, questionCount, questionCapsLevel, questionBloomsLevel, canGenerate, onResourceType, onDifficulty, onInstructions, onPaperType, onPaperTitle, onPaperMarks, onPaperDuration, onPaperDifficulty, onPaperYear, onQuestionType, onQuestionCount, onQuestionCapsLevel, onQuestionBloomsLevel, onBack, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">{outputTitle}</Badge>
        <h2 className="mt-2 text-xl font-semibold">Add the details</h2>
        <p className="text-sm text-muted-foreground">Subject, grade, term, and topic come from the curriculum, so only the task-specific choices are left.</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 text-sm font-medium">{curriculumContext?.subjectName ?? 'Prepared'}</p></div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Grade</p><p className="mt-1 text-sm font-medium">{curriculumContext?.gradeName ?? 'Prepared'}</p></div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Term</p><p className="mt-1 text-sm font-medium">Term {term}</p></div>
        </CardContent>
      </Card>
      {(selectedOutput === 'resource' || selectedOutput === 'homework') && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {RESOURCE_TYPES.map((type) => (
            <button key={type.value} type="button" onClick={() => onResourceType(type.value)} className={cn('rounded-lg border p-3 text-left transition-colors', resourceType === type.value ? 'border-primary bg-primary/5' : 'hover:bg-muted')}>
              <p className="text-sm font-semibold">{type.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>
      )}
      {selectedOutput === 'paper' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Paper Type</Label><Select value={paperType} onValueChange={(v: unknown) => onPaperType(v as PaperType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAPER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Title</Label><Input value={paperTitle} onChange={(e) => onPaperTitle(e.target.value)} placeholder={computedPaperTitle} /></div>
          <div className="space-y-2"><Label>Total Marks</Label><Input type="number" min={1} max={500} value={paperMarks} onChange={(e) => onPaperMarks(Number(e.target.value) || 1)} /></div>
          <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" min={5} max={480} value={paperDuration} onChange={(e) => onPaperDuration(Number(e.target.value) || 60)} /></div>
          <div className="space-y-2"><Label>Difficulty</Label><Select value={paperDifficulty} onValueChange={(v: unknown) => onPaperDifficulty(v as PaperDifficulty)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAPER_DIFFICULTIES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Year</Label><Input type="number" min={2000} max={2100} value={paperYear} onChange={(e) => onPaperYear(Number(e.target.value) || new Date().getFullYear())} /></div>
        </div>
      )}
      {selectedOutput === 'questions' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Question Type</Label><Select value={questionType} onValueChange={(v: unknown) => onQuestionType(v as QuestionType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Number of Questions</Label><Input type="number" min={1} max={20} value={questionCount} onChange={(e) => onQuestionCount(Number(e.target.value) || 1)} /></div>
          <div className="space-y-2"><Label>CAPS Cognitive Level</Label><Select value={questionCapsLevel} onValueChange={(v: unknown) => onQuestionCapsLevel(v as CapsLevel)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CAPS_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Bloom Level</Label><Select value={questionBloomsLevel} onValueChange={(v: unknown) => onQuestionBloomsLevel(v as BloomsLevel)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{BLOOMS_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
        </div>
      )}
      {selectedOutput !== 'paper' && (
        <div className="space-y-3">
          <Label>Difficulty</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {DIFFICULTIES.map((level) => <button key={level.value} type="button" onClick={() => onDifficulty(level.value)} className={cn('rounded-lg border px-3 py-2 text-sm font-medium transition-colors', difficulty === level.value ? 'border-primary bg-primary/5' : 'hover:bg-muted')}>{level.label}</button>)}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Special Instructions</Label>
        <Textarea value={instructions} onChange={(e) => onInstructions(e.target.value)} placeholder="Add any teacher instruction, e.g. more exam-style questions, South African examples, simpler language." className="min-h-24" />
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        <Button onClick={onNext} disabled={!canGenerate}>Review and Generate<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
