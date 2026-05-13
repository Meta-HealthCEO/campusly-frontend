'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Trash2, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import {
  ASSIGNMENT_LENGTHS,
  type AssignmentLatePolicy,
  type AssignmentLengthHint,
  type AssignmentSubmissionFormat,
  type RubricCriterionInput,
} from '@/types/assignments';

type Step = 1 | 2 | 3;

const LENGTH_LABELS: Record<AssignmentLengthHint, string> = {
  short:   'Short — worksheet scale',
  medium:  'Medium — essay or report (500-1000 words)',
  long:    'Long — essay or case study (1500-3000 words)',
  project: 'Project — multi-week deliverable',
};

const SUBMISSION_FORMAT_LABELS: Record<AssignmentSubmissionFormat, string> = {
  file: 'File upload only',
  text: 'Typed response only',
  both: 'File or typed response',
};

const LATE_POLICY_LABELS: Record<AssignmentLatePolicy, string> = {
  block:   'Block — late submissions rejected',
  penalty: 'Penalty — accept with mark deduction',
  accept:  'Accept — no penalty',
};

export default function NewAssignmentPage() {
  const router = useRouter();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { grades, loading: gradesLoading } = useGrades();
  const { generateDraft, create, update } = useTeacherAssignments();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — setup
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [totalMarks, setTotalMarks] = useState(50);
  const [lengthHint, setLengthHint] = useState<AssignmentLengthHint>('medium');
  const [criterionCount, setCriterionCount] = useState(4);
  const [instructions, setInstructions] = useState('');

  // Step 2 — AI draft (editable)
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [rubric, setRubric] = useState<RubricCriterionInput[]>([]);

  // Step 3 — publishing
  const [submissionFormat, setSubmissionFormat] = useState<AssignmentSubmissionFormat>('both');
  const [latePolicy, setLatePolicy] = useState<AssignmentLatePolicy>('block');
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(10);
  const [gradebookAutoPublish, setGradebookAutoPublish] = useState(true);
  const [creating, setCreating] = useState(false);

  const step1Ready =
    !!subjectId && !!gradeId && totalMarks > 0 && instructions.trim().length >= 10;
  const rubricSum = rubric.reduce((s, c) => s + c.maxMarks, 0);
  const step2Ready = title.trim().length > 0 && brief.trim().length > 0
    && rubric.length > 0 && rubricSum === totalMarks;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const draft = await generateDraft({
      subjectId,
      gradeId,
      totalMarks,
      lengthHint,
      criterionCount,
      instructions: instructions.trim(),
    });
    setGenerating(false);
    if (!draft) return;
    setTitle(draft.title);
    setBrief(draft.brief);
    setRubric(draft.rubric);
    setStep(2);
  }, [generateDraft, subjectId, gradeId, totalMarks, lengthHint, criterionCount, instructions]);

  const handleCreate = useCallback(async (publish: boolean) => {
    if (latePolicy === 'penalty' && latePenaltyPercent <= 0) {
      toast.error('Penalty % must be greater than 0.');
      return;
    }
    setCreating(true);
    const created = await create({
      title: title.trim(),
      brief: brief.trim(),
      subjectId,
      gradeId,
      totalMarks,
      rubric,
      submissionFormat,
      latePolicy,
      latePenaltyPercent: latePolicy === 'penalty' ? latePenaltyPercent : undefined,
      gradebookAutoPublish,
    });
    if (!created) {
      setCreating(false);
      return;
    }
    // Optionally flip to published immediately so the teacher can push it
    // to a class right away on the detail page.
    if (publish) {
      const published = await update(created._id, { status: 'published' });
      if (!published) {
        // Toast already surfaced from the hook; route anyway so the teacher
        // can retry from the header button.
      }
    }
    router.push(`/teacher/assignments/${created._id}`);
  }, [
    create, update, title, brief, subjectId, gradeId, totalMarks, rubric,
    submissionFormat, latePolicy, latePenaltyPercent, gradebookAutoPublish, router,
  ]);

  // ─── Step footers ────────────────────────────────────────────────────────

  const footer = (() => {
    if (step === 1) {
      return {
        onNext: () => void handleGenerate(),
        nextLabel: generating ? 'Generating draft…' : 'Generate draft with AI',
        nextLoading: generating,
        nextDisabled: !step1Ready || generating,
        nextIcon: generating
          ? undefined
          : <Sparkles className="ml-2 h-4 w-4" />,
      };
    }
    if (step === 2) {
      return {
        onNext: () => setStep(3),
        nextLabel: 'Publishing options',
        nextDisabled: !step2Ready,
      };
    }
    return {
      onNext: () => void handleCreate(true),
      nextLabel: creating ? 'Saving…' : 'Save & publish',
      nextLoading: creating,
      nextDisabled: creating,
      isFinal: true,
      secondary: {
        label: 'Save as draft',
        onClick: () => void handleCreate(false),
        loading: creating,
        disabled: creating,
      },
    };
  })();

  if (subjectsLoading || gradesLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="New Assignment"
        description="Tell the AI what you want, then edit the brief and rubric. You can publish to a class once it is ready."
      />

      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step >= 1 ? 'default' : 'outline'}>1 · Setup</Badge>
        <Badge variant={step >= 2 ? 'default' : 'outline'}>2 · Draft</Badge>
        <Badge variant={step >= 3 ? 'default' : 'outline'}>3 · Publish</Badge>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What is the assignment?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Subject, grade, and total marks are required. Then write — in your own
              words — exactly what you want the AI to draft. The more specific, the
              better.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={subjectId}
                  onValueChange={(v: string | null) => setSubjectId(v ?? '')}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pick subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select
                  value={gradeId}
                  onValueChange={(v: string | null) => setGradeId(v ?? '')}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pick grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Total marks <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Length hint</Label>
                <Select
                  value={lengthHint}
                  onValueChange={(v: string | null) => setLengthHint((v ?? 'medium') as AssignmentLengthHint)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_LENGTHS.map((l) => (
                      <SelectItem key={l} value={l}>{LENGTH_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rubric criteria</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={criterionCount}
                  onChange={(e) => setCriterionCount(Math.min(10, Math.max(2, Number(e.target.value) || 4)))}
                />
                <p className="text-xs text-muted-foreground">
                  Number of marking criteria the AI should produce. Marks split evenly across them.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Tell the AI exactly what you want <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                placeholder={`Examples:\n• "1500-word essay on the causes of WWI, focused on the Eastern Front. Accept video as alternative format."\n• "Group project: design and build a small bridge from spaghetti and tape. Include diagrams, materials list, and reflection."\n• "Research task on photosynthesis with at least 3 cited sources, due in 2 weeks."`}
                className="min-h-37.5 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. Be specific — the AI weaves your wording into
                the brief verbatim. {instructions.length}/4000
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">Draft</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edit anything you do not like, or regenerate for a fresh take.
                    Tweak instructions on step 1 first if needed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleGenerate()}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Brief (markdown supported)</Label>
                <Textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This is what students will see. {brief.length}/20000
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Rubric</CardTitle>
                <Badge
                  variant={rubricSum === totalMarks ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {rubricSum} / {totalMarks} marks
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Per-criterion marks must sum to total marks ({totalMarks}).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {rubric.map((c, idx) => (
                <RubricRow
                  key={idx}
                  value={c}
                  onChange={(next) =>
                    setRubric((prev) => prev.map((p, i) => (i === idx ? next : p)))
                  }
                  onRemove={() =>
                    setRubric((prev) => prev.filter((_, i) => i !== idx))
                  }
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRubric((prev) => [
                    ...prev,
                    { name: 'New criterion', description: '', maxMarks: 0 },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add criterion
              </Button>
              {rubricSum !== totalMarks && (
                <p className="text-xs text-destructive">
                  Adjust criterion marks so they sum to {totalMarks}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publishing options</CardTitle>
            <p className="text-sm text-muted-foreground">
              How students hand this in, and what happens after you mark it.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Submission format</Label>
              <Select
                value={submissionFormat}
                onValueChange={(v: string | null) =>
                  setSubmissionFormat((v ?? 'both') as AssignmentSubmissionFormat)
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBMISSION_FORMAT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Late policy</Label>
              <Select
                value={latePolicy}
                onValueChange={(v: string | null) =>
                  setLatePolicy((v ?? 'block') as AssignmentLatePolicy)
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LATE_POLICY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {latePolicy === 'penalty' && (
              <div className="space-y-1.5">
                <Label>Penalty %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={latePenaltyPercent}
                  onChange={(e) => setLatePenaltyPercent(Number(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
            )}

            <label className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gradebookAutoPublish}
                onChange={(e) => setGradebookAutoPublish(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm space-y-0.5">
                <span className="font-medium block">Auto-publish marks to gradebook</span>
                <span className="text-xs text-muted-foreground block">
                  When you finalise marking a submission, the mark goes straight to
                  the gradebook. Off means you publish manually.
                </span>
              </span>
            </label>

            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium">Saved as draft</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drafts are not pushed to classes yet - open the assignment, then push
                to a class with release and due dates from the Classes tab.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <WizardFooter
        step={step}
        totalSteps={3}
        onBack={step > 1 ? () => setStep((step - 1) as Step) : undefined}
        {...footer}
      />
    </div>
  );
}

interface RubricRowProps {
  value: RubricCriterionInput;
  onChange: (next: RubricCriterionInput) => void;
  onRemove: () => void;
}

function RubricRow({ value, onChange, onRemove }: RubricRowProps) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Criterion name"
          className="font-medium"
        />
        <Input
          type="number"
          min={0}
          value={value.maxMarks}
          onChange={(e) => onChange({ ...value, maxMarks: Number(e.target.value) || 0 })}
          className="w-24 text-center"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove criterion"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={value.description ?? ''}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="What you're looking for in this criterion (optional)"
        rows={2}
        className="text-sm"
      />
    </div>
  );
}
