'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CurriculumTreeBrowser, type CurriculumTreeBrowserSelectContext } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { extractErrorMessage } from '@/lib/api-helpers';
import { displayNodeTitle } from '@/lib/curriculum-display';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useCurriculumPreparation, extractCurriculumContext, contextsMatch } from '@/hooks/useCurriculumPreparation';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { useSubjectPaperDefaults } from '@/hooks/useSubjectPaperDefaults';
import {
  PAPER_TYPES, PAPER_DIFFICULTIES, buildPaperSections, paperTypeLabel,
} from './_constants';
import { StepIndicator, ContextBadge } from './_indicators';
import { QuestionMixEditor, DEFAULT_QUESTION_MIX } from './_QuestionMixEditor';
import type { CurriculumNodeItem } from '@/types';
import type { PaperDifficulty, PaperType, QuestionTypeWeight } from '@/types/papers';

// ─── Main wizard ───────────────────────────────────────────────────────────

export function PapersNewWizard() {
  const router = useRouter();
  const {
    frameworks, selectedFramework, searchNodes, loadNode, resolveAncestors,
  } = useCurriculumStructure();
  const { generatePaperWithAI } = useTeacherPapers(false);
  const prep = useCurriculumPreparation();

  const [step, setStep] = useState(1);
  const [selectedNodes, setSelectedNodes] = useState<CurriculumNodeItem[]>([]);
  const [paperType, setPaperType] = useState<PaperType>('class_test');
  const [paperTitle, setPaperTitle] = useState('');
  const [paperMarks, setPaperMarks] = useState(50);
  const [paperDuration, setPaperDuration] = useState(60);
  const [paperDifficulty, setPaperDifficulty] = useState<PaperDifficulty>('medium');
  const [paperYear, setPaperYear] = useState(new Date().getFullYear());
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [questionMix, setQuestionMix] = useState<QuestionTypeWeight[]>(DEFAULT_QUESTION_MIX);
  // Tracks whether the teacher has explicitly edited the mix in this wizard
  // session — used to decide if we should prefill from subject defaults when
  // a subject resolves later.
  const [mixTouched, setMixTouched] = useState(false);
  // Opt-in: pull from the teacher's curated Question Bank vs. generate
  // every question fresh. Default OFF — fresh generations don't risk
  // recycling questions the teacher hasn't committed to the bank yet.
  const [useExistingBank, setUseExistingBank] = useState(false);

  const subjectDefaults = useSubjectPaperDefaults(prep.subjectId || undefined);

  // When the resolved subject has saved defaults, prefill the wizard with
  // them — but only if the teacher hasn't edited the mix manually yet.
  useEffect(() => {
    if (mixTouched) return;
    const saved = subjectDefaults.defaults?.questionTypeMix;
    if (saved && saved.length > 0) setQuestionMix(saved);
  }, [subjectDefaults.defaults, mixTouched]);

  const handleMixChange = useCallback((next: QuestionTypeWeight[]) => {
    setQuestionMix(next);
    setMixTouched(true);
  }, []);

  const handleSaveMixAsDefault = useCallback(async () => {
    await subjectDefaults.saveDefaults(questionMix);
  }, [subjectDefaults, questionMix]);

  const selectedTopicIds = selectedNodes.map((n) => n.id);
  const selectedFrameworkMeta = frameworks.find((f) => f.id === selectedFramework);

  const computedTitle = useMemo(() => {
    const explicit = paperTitle.trim();
    return explicit || `Term ${prep.term || 1} ${paperTypeLabel(paperType)} ${paperYear}`;
  }, [paperTitle, paperType, paperYear, prep.term]);

  const canContinueFromTopics =
    selectedNodes.length > 0 &&
    prep.contextStatus === 'ready' &&
    Boolean(prep.subjectId && prep.gradeId && prep.term);

  // Map of node.id → resolved ancestors. Populated as nodes are selected so
  // we don't re-fetch when toggling the same node. Ancestors are how
  // extractCurriculumContext finds subject/grade names — the leaf node's own
  // `code` is unreliable for arbitrary imported curricula.
  const [ancestorsByNode, setAncestorsByNode] = useState<Record<string, CurriculumNodeItem[]>>({});

  const handleTopicSelect = useCallback(async (
    node: CurriculumNodeItem,
    ctx?: CurriculumTreeBrowserSelectContext,
  ) => {
    // CurriculumTreeBrowser fires onSelect TWICE per click: first synchronously
    // with `ctx.ancestors = []` (a "snappy UI" hint), then again after its
    // async resolveAncestors completes with the real chain. The snappy
    // emission would race against our own async work and un-toggle a freshly
    // selected node — swallow it. The search picker calls with ctx=undefined,
    // which we still process (we resolve ancestors ourselves on that path).
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
    setSelectedNodes((prev) => {
      const alreadySelected = prev.some((item) => item.id === node.id);
      const next = alreadySelected ? prev.filter((item) => item.id !== node.id) : [...prev, node];
      const primaryAncestors = prev[0] ? ancestorsByNode[prev[0].id] ?? [] : ancestors;
      const primaryContext = prev[0] ? extractCurriculumContext(prev[0], primaryAncestors) : nextContext;
      if (!alreadySelected && primaryContext && !contextsMatch(primaryContext, nextContext)) {
        toast.error('For one paper, choose topics from the same subject, grade, and term.');
        return prev;
      }
      const primary = next[0] ?? null;
      const primaryAncestorsForApply = primary ? (ancestorsByNode[primary.id] ?? ancestors) : undefined;
      prep.apply(primary, primaryAncestorsForApply);
      return next;
    });
  }, [prep, ancestorsByNode, resolveAncestors]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setSelectedNodes((prev) => {
      const next = prev.filter((item) => item.id !== nodeId);
      const primary = next[0] ?? null;
      const primaryAncestors = primary ? ancestorsByNode[primary.id] : undefined;
      prep.apply(primary, primaryAncestors);
      return next;
    });
  }, [prep, ancestorsByNode]);

  const handleGenerate = useCallback(async () => {
    if (!prep.subjectId || !prep.gradeId || !prep.term) return;
    setGenerating(true);
    try {
      // Drop any zero-weight rows — the BE schema accepts 0% but the AI
      // prompt is clearer without them. Skip the field entirely if the
      // remaining mix is empty (preserves legacy "no type targeting").
      const cleanedMix = questionMix.filter((m) => m.weight > 0);
      const generated = await generatePaperWithAI({
        subjectId: prep.subjectId,
        gradeId: prep.gradeId,
        topicIds: selectedTopicIds,
        term: prep.term,
        year: paperYear,
        paperType,
        duration: paperDuration,
        totalMarks: paperMarks,
        difficulty: paperDifficulty,
        title: computedTitle,
        sectionConfig: buildPaperSections(paperMarks),
        instructions: instructions.trim() || undefined,
        questionTypeMix: cleanedMix.length > 0 ? cleanedMix : undefined,
        useExistingBank,
      });
      if (generated?.paperId) {
        toast.success('Paper generated successfully');
        router.push(`/teacher/papers/${generated.paperId}`);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  }, [prep.subjectId, prep.gradeId, prep.term, selectedTopicIds, paperYear, paperType, paperDuration, paperMarks, paperDifficulty, computedTitle, instructions, questionMix, useExistingBank, generatePaperWithAI, router]);

  const stepHandlers = {
    1: { onNext: () => setStep(2), nextDisabled: !canContinueFromTopics },
    2: { onNext: () => setStep(3), nextDisabled: false, nextLabel: 'Review and Generate' },
    3: {
      onNext: () => void handleGenerate(),
      nextDisabled: generating,
      nextLoading: generating,
      nextLabel: generating ? 'Generating…' : 'Generate Paper with AI',
      isFinal: true,
      nextIcon: generating ? undefined : <FileText className="ml-2 h-4 w-4" />,
    },
  } as const;

  const current = stepHandlers[step as 1 | 2 | 3];

  return (
    <div className="space-y-6 pb-24">
      <StepIndicator current={step} />

      {/* ── Step 1: Topic picker (tree left, cart right) ─────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Choose curriculum topics</h2>
              <p className="text-sm text-muted-foreground">
                Click topics in the tree to add them. A paper can cover many topics from the same subject, grade, and term. {selectedFrameworkMeta?.name ?? 'CAPS'} framework is active.
              </p>
            </div>
            <ContextBadge status={prep.contextStatus} error={prep.contextError} />
          </div>

          {/* Fixed-width cart, flexible tree — at full screen width a 2:1
              grid would leave the cart hundreds of pixels wider than the
              ~10-item list needs. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Tree on the left */}
            <Card>
              <CardContent className="space-y-4">
                <Tabs defaultValue="browse">
                  <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList>
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
                      onChange={(_nodeId, node) => { if (node) void handleTopicSelect(node); }}
                      onSearch={searchNodes}
                      onLoadNode={loadNode}
                      placeholder="Search for a topic, subtopic, or assessment standard..."
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Cart on the right — sticky on desktop so it stays visible while scrolling tree */}
            <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Selected topics</h3>
                  <Badge variant="secondary">{selectedNodes.length}</Badge>
                </div>

                {selectedNodes.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">No topics yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Click a topic in the tree to add it here.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {selectedNodes.map((node) => (
                      <li key={node.id} className="flex items-start justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2">
                        <span className="min-w-0 flex-1 text-sm leading-snug">{displayNodeTitle(node)}</span>
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
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Step 2: Paper details ────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Paper details</h2>
            <p className="text-sm text-muted-foreground">Subject, grade, and term come from the curriculum selection.</p>
          </div>

          <Card>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 text-sm font-medium">{prep.curriculumContext?.subjectName}</p></div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Grade</p><p className="mt-1 text-sm font-medium">{prep.curriculumContext?.gradeName}</p></div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Term</p><p className="mt-1 text-sm font-medium">Term {prep.term}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paper Type</Label>
                <Select value={paperType} onValueChange={(v: unknown) => setPaperType(v as PaperType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} placeholder={computedTitle} />
              </div>
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" min={1} max={500} value={paperMarks} onChange={(e) => setPaperMarks(Number(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={5} max={480} value={paperDuration} onChange={(e) => setPaperDuration(Number(e.target.value) || 60)} />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={paperDifficulty} onValueChange={(v: unknown) => setPaperDifficulty(v as PaperDifficulty)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPER_DIFFICULTIES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" min={2000} max={2100} value={paperYear} onChange={(e) => setPaperYear(Number(e.target.value) || new Date().getFullYear())} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Special Instructions</Label>
                <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Add any specific instructions, e.g. more exam-style questions, South African examples, simpler language." className="min-h-24" />
              </div>
              <QuestionMixEditor
                value={questionMix}
                onChange={handleMixChange}
                onSaveAsDefault={prep.subjectId ? handleSaveMixAsDefault : undefined}
                saving={subjectDefaults.saving}
                subjectDefault={subjectDefaults.defaults?.questionTypeMix ?? null}
              />
              <label className="col-span-full flex items-start gap-3 rounded-lg border bg-muted/20 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExistingBank}
                  onChange={(e) => setUseExistingBank(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm space-y-0.5">
                  <span className="font-medium block">Reuse my saved Practice Questions</span>
                  <span className="text-xs text-muted-foreground block">
                    Pull matching questions from your curated bank first, then AI-fill any
                    deficit. Off by default — fresh papers don&apos;t recycle anything until
                    you&apos;ve explicitly committed questions to your bank from previous papers.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 3: Confirm and generate ────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Test or Exam Paper</Badge>
              <Badge variant="secondary">{selectedNodes.length} topic{selectedNodes.length === 1 ? '' : 's'}</Badge>
            </div>
            <CardTitle>Ready to generate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 text-sm font-medium">{prep.curriculumContext?.subjectName}</p></div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Grade</p><p className="mt-1 text-sm font-medium">{prep.curriculumContext?.gradeName}</p></div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Term</p><p className="mt-1 text-sm font-medium">Term {prep.term}</p></div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Curriculum coverage</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedNodes.map((node) => <Badge key={node.id} variant="outline" className="max-w-full truncate">{displayNodeTitle(node)}</Badge>)}
              </div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{computedTitle}</p>
              <p className="text-muted-foreground">{paperTypeLabel(paperType)} — {paperMarks} marks — {paperDuration} min — {paperDifficulty}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <WizardFooter
        step={step}
        totalSteps={3}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onNext={current.onNext}
        nextLabel={'nextLabel' in current ? current.nextLabel : undefined}
        nextIcon={'nextIcon' in current ? current.nextIcon : undefined}
        nextDisabled={current.nextDisabled}
        nextLoading={'nextLoading' in current ? current.nextLoading : undefined}
        isFinal={'isFinal' in current ? current.isFinal : undefined}
      />
    </div>
  );
}
