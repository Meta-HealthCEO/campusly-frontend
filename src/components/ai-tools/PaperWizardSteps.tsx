'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  ArrowLeft, ArrowRight, Sparkles, Plus, Trash2, Check,
} from 'lucide-react';
import type { SectionConfig } from './types';

const subjects = [
  'Mathematics', 'Physical Sciences', 'Life Sciences', 'English',
  'Geography', 'History', 'Accounting', 'Business Studies',
];
const sectionTypes = ['Multiple Choice (MCQ)', 'Short Answer', 'Long Answer', 'Essay', 'Calculation'];
const durations = ['30', '60', '90', '120'];

export function StepIndicator({ step, generated }: { step: number; generated: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            s === step ? 'bg-primary text-primary-foreground' :
            s < step || generated ? 'bg-primary/20 text-primary' :
            'bg-muted text-muted-foreground'
          }`}>
            {(s < step || (generated && s < 5)) ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 5 && <div className={`h-0.5 w-6 sm:w-10 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );
}

export function StepBasicInfo({ subject, setSubject, grade, setGrade, term, setTerm, topic, setTopic, canProceed, onNext }: {
  subject: string; setSubject: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  term: string; setTerm: (v: string) => void;
  topic: string; setTopic: (v: string) => void;
  canProceed: boolean; onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Paper Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term} onValueChange={(v) => v && setTerm(v)}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(t => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" placeholder="e.g. Chemical Reactions" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!canProceed}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepConfig({ duration, setDuration, totalMarks, setTotalMarks, difficulty, setDifficulty, canProceed, onBack, onNext }: {
  duration: string; setDuration: (v: string) => void;
  totalMarks: string; setTotalMarks: (v: string) => void;
  difficulty: string; setDifficulty: (v: 'easy' | 'medium' | 'hard' | 'mixed') => void;
  canProceed: boolean; onBack: () => void; onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Paper Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {durations.map(d => <SelectItem key={d} value={d}>{d} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalMarks">Total Marks</Label>
            <Input id="totalMarks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map(d => (
              <Button key={d} type="button" variant={difficulty === d ? 'default' : 'outline'} size="sm" onClick={() => setDifficulty(d)} className="capitalize">{d}</Button>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Button onClick={onNext} disabled={!canProceed}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepSections({ sections, totalMarks, sectionMarksTotal, addSection, removeSection, updateSection, onBack, onGenerate }: {
  sections: SectionConfig[]; totalMarks: string; sectionMarksTotal: number;
  addSection: () => void; removeSection: (id: string) => void;
  updateSection: (id: string, field: keyof SectionConfig, value: string | number) => void;
  onBack: () => void; onGenerate: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Paper Sections</CardTitle>
          <div className="text-sm text-muted-foreground">
            Section total: <span className={sectionMarksTotal === Number(totalMarks) ? 'font-bold text-emerald-600' : 'font-bold text-orange-500'}>{sectionMarksTotal}</span> / {totalMarks} marks
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section, idx) => (
          <div key={section.id} className="flex items-end gap-3 rounded-lg border p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {String.fromCharCode(65 + idx)}
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={section.type} onValueChange={(v) => v && updateSection(section.id, 'type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marks</Label>
                <Input type="number" value={section.marks} onChange={(e) => updateSection(section.id, 'marks', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Questions</Label>
                <Input type="number" value={section.questionCount} onChange={(e) => updateSection(section.id, 'questionCount', Number(e.target.value))} />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)} disabled={sections.length <= 1} className="shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={addSection} className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Section</Button>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Button onClick={onGenerate} disabled={sections.length === 0}><Sparkles className="mr-2 h-4 w-4" /> Generate Paper</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GeneratingAnimation({ subject, grade, term, topic, difficulty }: {
  subject: string; grade: string; term: string; topic: string; difficulty: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-16">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 h-4 w-4 animate-ping rounded-full bg-primary/40" />
          <div className="absolute -bottom-1 -left-1 h-3 w-3 animate-ping rounded-full bg-primary/30" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">AI is creating your paper...</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generating {subject} questions for Grade {grade}, Term {term}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Topic: {topic} -- Difficulty: {difficulty}</p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
