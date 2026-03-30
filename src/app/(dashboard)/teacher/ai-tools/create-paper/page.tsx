'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  FileText, ArrowLeft, ArrowRight, Sparkles, Plus,
  Trash2, RefreshCw, Pencil, Save, Download, Check,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface Section {
  id: string;
  type: string;
  marks: number;
  questionCount: number;
}

interface Question {
  id: string;
  number: string;
  text: string;
  marks: number;
  section: string;
  type: string;
  options?: string[];
  editing?: boolean;
}

const subjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English', 'Geography', 'History', 'Accounting', 'Business Studies'];
const sectionTypes = ['Multiple Choice (MCQ)', 'Short Answer', 'Long Answer', 'Essay', 'Calculation'];
const durations = ['30', '60', '90', '120'];

const mockGeneratedPaper: Question[] = [
  // Section A: MCQ
  { id: '1', number: '1.1', text: 'Which of the following is a chemical change?', marks: 2, section: 'A', type: 'MCQ', options: ['A) Melting ice', 'B) Dissolving sugar in water', 'C) Burning wood', 'D) Cutting paper'] },
  { id: '2', number: '1.2', text: 'The law of conservation of mass states that:', marks: 2, section: 'A', type: 'MCQ', options: ['A) Mass increases during reactions', 'B) Mass decreases during reactions', 'C) Mass is neither created nor destroyed', 'D) Mass only applies to solids'] },
  { id: '3', number: '1.3', text: 'In the reaction 2H₂ + O₂ → 2H₂O, the coefficient of oxygen is:', marks: 2, section: 'A', type: 'MCQ', options: ['A) 1', 'B) 2', 'C) 3', 'D) 4'] },
  { id: '4', number: '1.4', text: 'An exothermic reaction is one that:', marks: 2, section: 'A', type: 'MCQ', options: ['A) Absorbs heat energy', 'B) Releases heat energy', 'C) Has no energy change', 'D) Only occurs at high temperatures'] },
  { id: '5', number: '1.5', text: 'Which substance acts as a catalyst in the decomposition of hydrogen peroxide?', marks: 2, section: 'A', type: 'MCQ', options: ['A) Water', 'B) Sodium chloride', 'C) Manganese dioxide', 'D) Carbon dioxide'] },
  // Section B: Short Answer
  { id: '6', number: '2.1', text: 'Define a chemical reaction in your own words.', marks: 3, section: 'B', type: 'Short Answer' },
  { id: '7', number: '2.2', text: 'List THREE signs that indicate a chemical reaction has taken place.', marks: 3, section: 'B', type: 'Short Answer' },
  { id: '8', number: '2.3', text: 'Balance the following equation: Fe + O₂ → Fe₂O₃', marks: 4, section: 'B', type: 'Short Answer' },
  { id: '9', number: '2.4', text: 'Explain the difference between a synthesis and decomposition reaction. Provide one example of each.', marks: 5, section: 'B', type: 'Short Answer' },
  // Section C: Long Answer
  { id: '10', number: '3.1', text: 'A learner heats 10g of calcium carbonate (CaCO₃) in a crucible.\n\na) Write the balanced equation for the thermal decomposition of calcium carbonate.\nb) Calculate the mass of calcium oxide (CaO) produced. (Molar masses: Ca=40, C=12, O=16)\nc) Explain why the mass of the solid decreases after heating.\nd) Classify this reaction as exothermic or endothermic. Justify your answer.', marks: 12, section: 'C', type: 'Long Answer' },
  { id: '11', number: '3.2', text: 'Describe an experiment to investigate the factors that affect the rate of a chemical reaction between hydrochloric acid and magnesium ribbon.\n\na) State the independent and dependent variables.\nb) Describe the method clearly, including apparatus needed.\nc) Explain how you would ensure a fair test.\nd) Predict what would happen if the concentration of acid is doubled.', marks: 13, section: 'C', type: 'Long Answer' },
];

export default function CreatePaperPage() {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saved, setSaved] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60');
  const [totalMarks, setTotalMarks] = useState('50');
  const [difficulty, setDifficulty] = useState('medium');
  const [sections, setSections] = useState<Section[]>([
    { id: '1', type: 'Multiple Choice (MCQ)', marks: 10, questionCount: 5 },
    { id: '2', type: 'Short Answer', marks: 15, questionCount: 4 },
    { id: '3', type: 'Long Answer', marks: 25, questionCount: 2 },
  ]);

  const addSection = () => {
    setSections([...sections, {
      id: Date.now().toString(),
      type: 'Short Answer',
      marks: 10,
      questionCount: 3,
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof Section, value: string | number) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setQuestions(mockGeneratedPaper);
      setGenerating(false);
      setGenerated(true);
      setStep(5);
    }, 3000);
  };

  const handleRegenerateQuestion = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, text: q.text + ' [Regenerated]' } : q
    ));
  };

  const toggleEdit = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, editing: !q.editing } : q
    ));
  };

  const updateQuestionText = (questionId: string, text: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, text } : q
    ));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const canProceed = () => {
    if (step === 1) return subject && grade && term && topic;
    if (step === 2) return duration && totalMarks && difficulty;
    if (step === 3) return sections.length > 0;
    return true;
  };

  const sectionMarksTotal = sections.reduce((sum, s) => sum + s.marks, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Create Paper" description="Generate an exam paper with AI">
        <Link href={ROUTES.TEACHER_AI_TOOLS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Tools
          </Button>
        </Link>
      </PageHeader>

      {/* Step Indicator */}
      {!generating && (
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
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paper Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(t => (
                      <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g. Chemical Reactions"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceed()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Paper Config */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Paper Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map(d => (
                      <SelectItem key={d} value={d}>{d} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard', 'mixed'].map(d => (
                  <Button
                    key={d}
                    type="button"
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className="capitalize"
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceed()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sections */}
      {step === 3 && (
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marks</Label>
                    <Input
                      type="number"
                      value={section.marks}
                      onChange={(e) => updateSection(section.id, 'marks', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Questions</Label>
                    <Input
                      type="number"
                      value={section.questionCount}
                      onChange={(e) => updateSection(section.id, 'questionCount', Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(section.id)}
                  disabled={sections.length <= 1}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addSection} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Add Section
            </Button>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => { setStep(4); handleGenerate(); }} disabled={sections.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Paper
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Generating */}
      {step === 4 && generating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 animate-ping rounded-full bg-primary/40" />
              <div className="absolute -bottom-1 -left-1 h-3 w-3 animate-ping rounded-full bg-primary/30" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-1/2 -right-3 h-2 w-2 animate-ping rounded-full bg-primary/20" style={{ animationDelay: '1s' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">AI is creating your paper...</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Generating {subject} questions for Grade {grade}, Term {term}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Topic: {topic} — Difficulty: {difficulty}</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Paper Preview */}
      {step === 5 && generated && (
        <div className="space-y-4">
          {/* Paper Header */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">{subject} — Grade {grade}</h2>
                <p className="text-sm text-muted-foreground">Term {term} Examination — {topic}</p>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Duration: {duration} minutes</span>
                  <span>Total Marks: {totalMarks}</span>
                  <Badge variant="secondary" className="capitalize">{difficulty}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions by Section */}
          {['A', 'B', 'C'].map(sectionLabel => {
            const sectionQuestions = questions.filter(q => q.section === sectionLabel);
            if (sectionQuestions.length === 0) return null;
            const sectionType = sectionQuestions[0].type;
            const sectionTotal = sectionQuestions.reduce((s, q) => s + q.marks, 0);
            return (
              <div key={sectionLabel} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Section {sectionLabel}: {sectionType}</h3>
                  <Badge variant="outline">{sectionTotal} marks</Badge>
                </div>
                {sectionQuestions.map(q => (
                  <Card key={q.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground">Q{q.number}</span>
                            <Badge variant="secondary" className="text-xs">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</Badge>
                          </div>
                          {q.editing ? (
                            <textarea
                              className="w-full rounded-md border p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                              value={q.text}
                              onChange={(e) => updateQuestionText(q.id, e.target.value)}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-line">{q.text}</p>
                          )}
                          {q.options && !q.editing && (
                            <div className="ml-4 space-y-1">
                              {q.options.map((opt, i) => (
                                <p key={i} className="text-sm text-muted-foreground">{opt}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleEdit(q.id)} title={q.editing ? 'Save' : 'Edit'}>
                            {q.editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRegenerateQuestion(q.id)} title="Regenerate">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}

          {/* Actions */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Link href={ROUTES.TEACHER_AI_PAPERS}>
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSave}>
                  {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  {saved ? 'Saved!' : 'Save'}
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
