'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  ArrowLeft, Sparkles, ChevronDown, ChevronUp,
  Check, CheckCircle, Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface Criterion {
  name: string;
  maxMarks: number;
  aiMarks: number;
}

interface Submission {
  id: string;
  studentName: string;
  submittedDate: string;
  status: 'ungraded' | 'ai-graded' | 'reviewed' | 'published';
  submissionText: string;
  criteria: Criterion[];
  aiFeedback: string;
  strengths: string[];
  improvements: string[];
  totalMarks: number;
  maxTotal: number;
}

const assignments = [
  { id: 'a1', name: 'Grade 9 English — Essay: "My Role Model"', submissions: 8 },
  { id: 'a2', name: 'Grade 10 Science — Lab Report: Acids & Bases', submissions: 12 },
  { id: 'a3', name: 'Grade 11 Mathematics — Problem Set 4', submissions: 15 },
];

const criteriaTemplate = [
  { name: 'Content & Ideas', maxMarks: 10 },
  { name: 'Language & Grammar', maxMarks: 8 },
  { name: 'Structure & Organisation', maxMarks: 7 },
  { name: 'Vocabulary & Expression', maxMarks: 5 },
];

const mockSubmissions: Submission[] = [
  {
    id: 's1', studentName: 'Thandi Mokoena', submittedDate: '2026-03-28', status: 'ai-graded',
    submissionText: 'My role model is my grandmother, who raised five children on her own while working as a nurse. She taught me the importance of perseverance and kindness...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 8 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 7 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 6 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 4 }],
    aiFeedback: 'A heartfelt essay with strong personal connection. The narrative flows well with good use of specific examples. Consider varying sentence structure more and developing the conclusion further.',
    strengths: ['Strong personal voice', 'Good use of examples', 'Clear narrative flow'],
    improvements: ['Vary sentence length', 'Expand conclusion', 'Add more descriptive language'],
    totalMarks: 25, maxTotal: 30,
  },
  {
    id: 's2', studentName: 'Sipho Ndlovu', submittedDate: '2026-03-28', status: 'ai-graded',
    submissionText: 'Nelson Mandela is my role model because he fought for freedom and equality. He spent 27 years in prison but never gave up on his dream...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 7 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 6 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 5 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 3 }],
    aiFeedback: 'Good choice of role model with relevant historical context. The essay would benefit from more personal reflection on how Mandela\'s values influence the writer\'s own life.',
    strengths: ['Good historical knowledge', 'Clear thesis statement', 'Relevant examples'],
    improvements: ['Add personal reflection', 'Improve paragraph transitions', 'Use more varied vocabulary'],
    totalMarks: 21, maxTotal: 30,
  },
  {
    id: 's3', studentName: 'Lerato Khumalo', submittedDate: '2026-03-27', status: 'reviewed',
    submissionText: 'I admire my older sister who is studying medicine at university. Despite facing many challenges, she continues to work hard and inspire our whole family...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 9 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 8 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 7 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 5 }],
    aiFeedback: 'An excellent essay that beautifully captures the personal impact of a family role model. Exceptional vocabulary and sentence variety. Well-structured with a compelling conclusion.',
    strengths: ['Exceptional writing quality', 'Strong emotional impact', 'Excellent structure', 'Rich vocabulary'],
    improvements: ['Minor: could include a counter-argument'],
    totalMarks: 29, maxTotal: 30,
  },
  {
    id: 's4', studentName: 'Bongani Dlamini', submittedDate: '2026-03-27', status: 'ungraded',
    submissionText: 'My role model is my football coach Mr. Peters. He teaches us not only about football but about life and being a good person...',
    criteria: criteriaTemplate.map(c => ({ ...c, aiMarks: 0 })),
    aiFeedback: '', strengths: [], improvements: [],
    totalMarks: 0, maxTotal: 30,
  },
  {
    id: 's5', studentName: 'Naledi Molefe', submittedDate: '2026-03-27', status: 'ai-graded',
    submissionText: 'The person I look up to most is Elon Musk. He has built multiple companies and is trying to make humanity a multi-planetary species...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 6 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 7 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 6 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 4 }],
    aiFeedback: 'The essay presents a well-known figure but lacks critical analysis. Consider exploring both positive and negative aspects of the role model and adding more personal connection.',
    strengths: ['Good factual knowledge', 'Competent grammar', 'Clear writing style'],
    improvements: ['Add critical analysis', 'Include personal connection', 'Develop deeper arguments'],
    totalMarks: 23, maxTotal: 30,
  },
  {
    id: 's6', studentName: 'Amahle Zulu', submittedDate: '2026-03-26', status: 'published',
    submissionText: 'My mother is my greatest role model. As a single parent, she works two jobs to support our education while always making time for us...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 8 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 7 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 6 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 4 }],
    aiFeedback: 'A touching and well-written essay with genuine emotion. The writing is clear and the examples are specific and meaningful. Good overall structure.',
    strengths: ['Genuine emotion', 'Specific examples', 'Clear writing'],
    improvements: ['Could use more literary devices', 'Slightly expand body paragraphs'],
    totalMarks: 25, maxTotal: 30,
  },
  {
    id: 's7', studentName: 'Kagiso Mabaso', submittedDate: '2026-03-26', status: 'ungraded',
    submissionText: 'I chose my dad as my role model because he always tells me to work hard and never give up no matter what happens in life...',
    criteria: criteriaTemplate.map(c => ({ ...c, aiMarks: 0 })),
    aiFeedback: '', strengths: [], improvements: [],
    totalMarks: 0, maxTotal: 30,
  },
  {
    id: 's8', studentName: 'Zanele Nkosi', submittedDate: '2026-03-26', status: 'ai-graded',
    submissionText: 'Trevor Noah is my role model. Growing up in South Africa during apartheid, he overcame incredible obstacles to become one of the most successful comedians...',
    criteria: [{ name: 'Content & Ideas', maxMarks: 10, aiMarks: 8 }, { name: 'Language & Grammar', maxMarks: 8, aiMarks: 7 }, { name: 'Structure & Organisation', maxMarks: 7, aiMarks: 7 }, { name: 'Vocabulary & Expression', maxMarks: 5, aiMarks: 4 }],
    aiFeedback: 'Well-researched essay with good connection between the role model\'s experiences and broader themes of resilience. Strong structure and engaging writing style.',
    strengths: ['Well-researched', 'Good thematic connections', 'Engaging style', 'Strong structure'],
    improvements: ['Add more personal reflection', 'Include specific quotes'],
    totalMarks: 26, maxTotal: 30,
  },
];

const statusConfig = {
  ungraded: { label: 'Ungraded', variant: 'outline' as const },
  'ai-graded': { label: 'AI Graded', variant: 'secondary' as const },
  reviewed: { label: 'Reviewed', variant: 'default' as const },
  published: { label: 'Published', variant: 'default' as const },
};

export default function GradingPage() {
  const [selectedAssignment, setSelectedAssignment] = useState('a1');
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);

  const handleGradeAll = () => {
    setGrading(true);
    setGradingProgress(0);
    const ungradedCount = submissions.filter(s => s.status === 'ungraded').length;
    const interval = 3000 / (ungradedCount || 1);
    let progress = 0;

    const timer = setInterval(() => {
      progress += 100 / (ungradedCount || 1);
      setGradingProgress(Math.min(progress, 100));

      if (progress >= 100) {
        clearInterval(timer);
        setSubmissions(prev => prev.map(s => {
          if (s.status === 'ungraded') {
            const aiMarks = [7, 6, 5, 4];
            return {
              ...s,
              status: 'ai-graded' as const,
              criteria: s.criteria.map((c, i) => ({ ...c, aiMarks: aiMarks[i] || 5 })),
              aiFeedback: 'The essay demonstrates understanding of the topic with personal connection. Work on developing arguments further and improving vocabulary range.',
              strengths: ['Personal connection', 'Clear writing'],
              improvements: ['Develop arguments', 'Expand vocabulary', 'Add more detail'],
              totalMarks: 22,
            };
          }
          return s;
        }));
        setTimeout(() => setGrading(false), 500);
      }
    }, interval);
  };

  const updateCriterionMarks = (submissionId: string, criterionIdx: number, marks: number) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        const newCriteria = [...s.criteria];
        newCriteria[criterionIdx] = { ...newCriteria[criterionIdx], aiMarks: Math.min(marks, newCriteria[criterionIdx].maxMarks) };
        const newTotal = newCriteria.reduce((sum, c) => sum + c.aiMarks, 0);
        return { ...s, criteria: newCriteria, totalMarks: newTotal };
      }
      return s;
    }));
  };

  const updateFeedback = (submissionId: string, feedback: string) => {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, aiFeedback: feedback } : s
    ));
  };

  const approveSubmission = (submissionId: string) => {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, status: 'reviewed' as const } : s
    ));
  };

  const bulkApprove = () => {
    setSubmissions(prev => prev.map(s =>
      s.status === 'ai-graded' ? { ...s, status: 'reviewed' as const } : s
    ));
  };

  const ungradedCount = submissions.filter(s => s.status === 'ungraded').length;
  const aiGradedCount = submissions.filter(s => s.status === 'ai-graded').length;
  const reviewedCount = submissions.filter(s => s.status === 'reviewed' || s.status === 'published').length;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Grading Hub" description="Grade student submissions with AI assistance">
        <Link href={ROUTES.TEACHER_AI_TOOLS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Tools
          </Button>
        </Link>
      </PageHeader>

      {/* Assignment Select + Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Select Assignment</Label>
          <Select value={selectedAssignment} onValueChange={(v) => v && setSelectedAssignment(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignments.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name} ({a.submissions})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {ungradedCount > 0 && (
            <Button onClick={handleGradeAll} disabled={grading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {grading ? 'Grading...' : `Grade All with AI (${ungradedCount})`}
            </Button>
          )}
          {aiGradedCount > 0 && (
            <Button variant="outline" onClick={bulkApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All ({aiGradedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Grading Progress */}
      {grading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                  AI is grading submissions...
                </span>
                <span className="text-muted-foreground">{Math.round(gradingProgress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${gradingProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex gap-3">
        <Badge variant="outline" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" /> {ungradedCount} Ungraded
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> {aiGradedCount} AI Graded
        </Badge>
        <Badge variant="default" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {reviewedCount} Reviewed
        </Badge>
      </div>

      {/* Submissions */}
      <div className="space-y-2">
        {submissions.map(sub => {
          const isExpanded = expandedId === sub.id;
          const config = statusConfig[sub.status];
          const percentage = sub.maxTotal > 0 ? Math.round((sub.totalMarks / sub.maxTotal) * 100) : 0;

          return (
            <Card key={sub.id}>
              {/* Summary Row */}
              <button
                className="w-full text-left"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{sub.studentName}</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Submitted {sub.submittedDate}</p>
                  </div>
                  {sub.status !== 'ungraded' && (
                    <div className="text-right hidden sm:block">
                      <p className="font-bold">{sub.totalMarks}/{sub.maxTotal}</p>
                      <p className={`text-xs font-medium ${percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {percentage}%
                      </p>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
                </CardContent>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t px-5 pb-5 pt-4 space-y-5">
                  {/* Submission Preview */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Student Submission</Label>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm">{sub.submissionText}</div>
                  </div>

                  {sub.status !== 'ungraded' && (
                    <>
                      {/* Criteria Marks */}
                      <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Marks per Criterion</Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {sub.criteria.map((c, idx) => (
                            <div key={c.name} className="flex items-center gap-3 rounded-lg border p-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground">Max: {c.maxMarks}</p>
                              </div>
                              <Input
                                type="number"
                                className="w-16 text-center"
                                value={c.aiMarks}
                                min={0}
                                max={c.maxMarks}
                                onChange={(e) => updateCriterionMarks(sub.id, idx, Number(e.target.value))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Feedback */}
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">AI Feedback</Label>
                        <Textarea
                          value={sub.aiFeedback}
                          onChange={(e) => updateFeedback(sub.id, e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Strengths & Improvements */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Strengths</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {sub.strengths.map(s => (
                              <Badge key={s} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Areas for Improvement</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {sub.improvements.map(imp => (
                              <Badge key={imp} variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{imp}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {sub.status === 'ai-graded' && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={() => approveSubmission(sub.id)}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => approveSubmission(sub.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit & Approve
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {sub.status === 'ungraded' && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      This submission has not been graded yet. Use &quot;Grade All with AI&quot; to grade.
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
