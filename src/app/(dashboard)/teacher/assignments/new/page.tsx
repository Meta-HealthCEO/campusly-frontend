'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { type CurriculumTreeBrowserSelectContext } from '@/components/curriculum/CurriculumTreeBrowser';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import {
  useCurriculumPreparation,
  extractCurriculumContext,
  contextsMatch,
} from '@/hooks/useCurriculumPreparation';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { StepSetup } from './_StepSetup';
import { StepDraft } from './_StepDraft';
import { StepPublish } from './_StepPublish';
import type {
  AssignmentLatePolicy,
  AssignmentLengthHint,
  AssignmentSubmissionFormat,
  RubricCriterionInput,
} from '@/types/assignments';
import type { CurriculumNodeItem } from '@/types';

type Step = 1 | 2 | 3;

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
        <StepSetup
          prep={prep}
          selectedFramework={selectedFramework}
          frameworkName={selectedFrameworkMeta?.name ?? null}
          selectedNodes={selectedNodes}
          onTopicSelect={(node, ctx) => void handleTopicSelect(node, ctx)}
          onRemoveNode={handleRemoveNode}
          searchNodes={searchNodes}
          loadNode={loadNode}
          totalMarks={totalMarks}
          setTotalMarks={setTotalMarks}
          lengthHint={lengthHint}
          setLengthHint={setLengthHint}
          criterionCount={criterionCount}
          setCriterionCount={setCriterionCount}
          instructions={instructions}
          setInstructions={setInstructions}
          blocker={step1Blocker}
        />
      )}

      {step === 2 && (
        <StepDraft
          title={title}
          setTitle={setTitle}
          brief={brief}
          setBrief={setBrief}
          rubric={rubric}
          setRubric={setRubric}
          rubricSum={rubricSum}
          totalMarks={totalMarks}
          generating={generating}
          onRegenerate={() => void handleGenerate()}
        />
      )}

      {step === 3 && (
        <StepPublish
          submissionFormat={submissionFormat}
          setSubmissionFormat={setSubmissionFormat}
          latePolicy={latePolicy}
          setLatePolicy={setLatePolicy}
          latePenaltyPercent={latePenaltyPercent}
          setLatePenaltyPercent={setLatePenaltyPercent}
          gradebookAutoPublish={gradebookAutoPublish}
          setGradebookAutoPublish={setGradebookAutoPublish}
        />
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
