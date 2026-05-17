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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WizardFooter } from '@/components/shared/WizardFooter';
import {
  CurriculumTreeBrowser,
  type CurriculumTreeBrowserSelectContext,
} from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { displayNodeTitle } from '@/lib/curriculum-display';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { RichTextView } from '@/components/shared/RichTextView';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import {
  useCurriculumPreparation,
  extractCurriculumContext,
  contextsMatch,
} from '@/hooks/useCurriculumPreparation';
import { ContextBadge } from '../../papers/new/_indicators';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import {
  ASSIGNMENT_LENGTHS,
  type AssignmentLatePolicy,
  type AssignmentLengthHint,
  type AssignmentSubmissionFormat,
  type RubricCriterionInput,
} from '@/types/assignments';
import type { CurriculumNodeItem } from '@/types';

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
  const {
    frameworks, selectedFramework, searchNodes, loadNode, resolveAncestors,
  } = useCurriculumStructure();
  const prep = useCurriculumPreparation();
  // Pull `apply` out as a stable reference. `prep` itself is a fresh object
  // every render — using `prep.apply` directly as an effect dep loops forever.
  const applyPrep = prep.apply;
  const { generateDraft, create, update } = useTeacherAssignments();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — non-curriculum settings (curriculum picks live in `prep`)
  const [selectedNodes, setSelectedNodes] = useState<CurriculumNodeItem[]>([]);
  const [totalMarks, setTotalMarks] = useState(50);
  const [lengthHint, setLengthHint] = useState<AssignmentLengthHint>('medium');
  const [criterionCount, setCriterionCount] = useState(4);
  const [instructions, setInstructions] = useState('');

  // Track ancestors per node we've seen — avoids re-fetching when the same
  // node is re-clicked. Matches the pattern in _PapersNewWizard.
  const [ancestorsByNode, setAncestorsByNode] = useState<Record<string, CurriculumNodeItem[]>>({});

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

  const selectedFrameworkMeta = frameworks.find((f) => f.id === selectedFramework);

  const handleTopicSelect = useCallback(async (
    node: CurriculumNodeItem,
    ctx?: CurriculumTreeBrowserSelectContext,
  ) => {
    // CurriculumTreeBrowser fires onSelect twice per click: first synchronously
    // with `ctx.ancestors = []` (a "snappy UI" hint), then again after its
    // async resolveAncestors completes. Swallow the snappy emission. The
    // search picker calls with ctx=undefined; we resolve ancestors there too.
    if (ctx && (!ctx.ancestors || ctx.ancestors.length === 0)) return;

    let ancestors = ctx?.ancestors ?? ancestorsByNode[node.id] ?? [];
    if (ancestors.length === 0) {
      ancestors = await resolveAncestors(node);
    }
    if (ancestors.length > 0) {
      setAncestorsByNode((prev) => (prev[node.id] ? prev : { ...prev, [node.id]: ancestors }));
    }

    const nextContext = extractCurriculumContext(node, ancestors);
    if (!nextContext) {
      toast.error('Choose a CAPS topic or subtopic that includes subject, grade, and term.');
      return;
    }
    // Compute the next selection from the current snapshot, then apply it
    // and sync prep in one shot. We deliberately don't put a side-effect
    // inside the setSelectedNodes updater — that runs twice under StrictMode
    // and could double-call apply.
    const alreadySelected = selectedNodes.some((item) => item.id === node.id);
    let next: CurriculumNodeItem[];
    if (alreadySelected) {
      next = selectedNodes.filter((item) => item.id !== node.id);
    } else {
      const primaryAncestors = selectedNodes[0]
        ? ancestorsByNode[selectedNodes[0].id] ?? []
        : ancestors;
      const primaryContext = selectedNodes[0]
        ? extractCurriculumContext(selectedNodes[0], primaryAncestors)
        : nextContext;
      if (primaryContext && !contextsMatch(primaryContext, nextContext)) {
        toast.error('For one assignment, choose topics from the same subject, grade, and term.');
        return;
      }
      next = [...selectedNodes, node];
    }
    setSelectedNodes(next);

    const primary = next[0] ?? null;
    const primaryAncestorsForApply = primary
      ? (ancestorsByNode[primary.id] ?? ancestors)
      : undefined;
    applyPrep(primary, primaryAncestorsForApply);
  }, [selectedNodes, ancestorsByNode, resolveAncestors, applyPrep]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    const next = selectedNodes.filter((item) => item.id !== nodeId);
    setSelectedNodes(next);
    const primary = next[0] ?? null;
    const primaryAncestors = primary ? ancestorsByNode[primary.id] : undefined;
    applyPrep(primary, primaryAncestors);
  }, [selectedNodes, ancestorsByNode, applyPrep]);

  const step1Blocker: string | null = (() => {
    if (selectedNodes.length === 0) return 'Pick at least one CAPS topic from the tree.';
    if (prep.contextStatus === 'preparing') return 'Preparing subject and grade — give it a second…';
    if (prep.contextStatus === 'error') {
      return prep.contextError ?? 'Could not resolve the subject/grade for this topic.';
    }
    if (!prep.subjectId || !prep.gradeId) {
      return 'Subject or grade could not be resolved for this topic.';
    }
    if (totalMarks <= 0) return 'Total marks must be at least 1.';
    const instructionsLen = instructions.trim().length;
    if (instructionsLen < 10) {
      return `Instructions need ${10 - instructionsLen} more character${10 - instructionsLen === 1 ? '' : 's'}.`;
    }
    return null;
  })();
  const step1Ready = step1Blocker === null;

  const rubricSum = rubric.reduce((s, c) => s + c.maxMarks, 0);
  const step2Ready = title.trim().length > 0 && brief.trim().length > 0
    && rubric.length > 0 && rubricSum === totalMarks;

  const handleGenerate = useCallback(async () => {
    if (!prep.subjectId || !prep.gradeId || selectedNodes.length === 0) return;
    setGenerating(true);
    const draft = await generateDraft({
      subjectId: prep.subjectId,
      gradeId: prep.gradeId,
      topicIds: selectedNodes.map((n) => n.id),
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
  }, [
    generateDraft, prep.subjectId, prep.gradeId, selectedNodes,
    totalMarks, lengthHint, criterionCount, instructions,
  ]);

  const handleCreate = useCallback(async (publish: boolean) => {
    if (!prep.subjectId || !prep.gradeId || selectedNodes.length === 0) return;
    if (latePolicy === 'penalty' && latePenaltyPercent <= 0) {
      toast.error('Penalty % must be greater than 0.');
      return;
    }
    setCreating(true);
    const created = await create({
      title: title.trim(),
      brief: brief.trim(),
      subjectId: prep.subjectId,
      gradeId: prep.gradeId,
      topicIds: selectedNodes.map((n) => n.id),
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
    if (publish) {
      await update(created._id, { status: 'published' });
    }
    router.push(`/teacher/assignments/${created._id}`);
  }, [
    create, update, title, brief, prep.subjectId, prep.gradeId, selectedNodes,
    totalMarks, rubric, submissionFormat, latePolicy, latePenaltyPercent,
    gradebookAutoPublish, router,
  ]);

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

  if (!selectedFramework || frameworks.length === 0) return <LoadingSpinner />;

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
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Choose a CAPS topic</h2>
              <p className="text-sm text-muted-foreground">
                The AI uses this topic to anchor the brief and rubric. Subject,
                grade, and term are derived automatically.
                {selectedFrameworkMeta && ` ${selectedFrameworkMeta.name} framework is active.`}
              </p>
            </div>
            <ContextBadge status={prep.contextStatus} error={prep.contextError} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Curriculum tree on the left */}
            <Card>
              <CardContent className="space-y-3">
                <Tabs defaultValue="browse">
                  <TabsList>
                    <TabsTrigger value="browse">Browse</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                  </TabsList>
                  <TabsContent value="browse" className="mt-3">
                    <div className="max-h-[64vh] min-h-96 overflow-y-auto rounded-md border p-1">
                      <CurriculumTreeBrowser
                        frameworkId={selectedFramework}
                        selectedNodeId={prep.selectedNode?.id ?? null}
                        selectedNodeIds={selectedNodes.map((n) => n.id)}
                        onSelect={(node, ctx) => void handleTopicSelect(node, ctx)}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="search" className="mt-3">
                    <NodePicker
                      frameworkId={selectedFramework}
                      value={prep.selectedNode?.id ?? null}
                      onChange={(_id, node) => { if (node) void handleTopicSelect(node); }}
                      onSearch={searchNodes}
                      onLoadNode={loadNode}
                      placeholder="Search for a topic, subtopic, or assessment standard…"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Settings on the right (sticky so they stay visible) */}
            <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Assignment settings</CardTitle>
                  <Badge variant="secondary">
                    {selectedNodes.length} topic{selectedNodes.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedNodes.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Pick one or more topics from the tree. They must all share the
                    same subject, grade, and term.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {selectedNodes.map((node) => (
                      <li
                        key={node.id}
                        className="flex items-start justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 text-sm leading-snug">
                          {displayNodeTitle(node)}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveNode(node.id)}
                          aria-label="Remove topic"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {prep.curriculumContext && selectedNodes.length > 0 && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Context</p>
                    <p className="mt-1 font-medium">
                      {prep.curriculumContext.subjectName} · {prep.curriculumContext.gradeName} · Term {prep.term}
                    </p>
                  </div>
                )}

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
                    onValueChange={(v: string | null) =>
                      setLengthHint((v ?? 'medium') as AssignmentLengthHint)
                    }
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
                    onChange={(e) =>
                      setCriterionCount(Math.min(10, Math.max(2, Number(e.target.value) || 4)))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI produces this many criteria. Marks split evenly across them.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Instructions for the AI <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={8}
                    placeholder={`Examples:\n• "1500-word essay on causes of WWI, focused on the Eastern Front. Accept video as alternative format."\n• "Group project: design a small bridge from spaghetti and tape. Include diagrams, materials list, and reflection."\n• "Research task on photosynthesis with at least 3 cited sources, due in 2 weeks."`}
                    className="min-h-37.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Min 10 chars. The AI weaves your wording into the brief verbatim.
                    {' '}{instructions.length}/4000
                  </p>
                </div>

                {step === 1 && step1Blocker && (
                  <div className="rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Before generating
                    </p>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300">{step1Blocker}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
                <Label>Brief</Label>
                <Tabs defaultValue="edit">
                  <TabsList>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit" className="mt-3">
                    <RichTextEditor
                      initialHtml={brief}
                      onChange={setBrief}
                      minHeight="min-h-112"
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-3">
                    <div className="rounded-md border bg-muted/10 p-4 min-h-112 max-h-160 overflow-y-auto">
                      {brief.trim().length > 0 ? (
                        <RichTextView html={brief} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Nothing to preview yet.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  Edit uses formatting controls; Preview shows exactly what students will see.
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
