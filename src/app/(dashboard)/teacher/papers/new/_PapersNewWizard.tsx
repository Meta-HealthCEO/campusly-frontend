'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useCurriculumPreparation, extractCurriculumContext, contextsMatch } from '@/hooks/useCurriculumPreparation';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import {
  PAPER_TYPES, PAPER_DIFFICULTIES, buildPaperSections, paperTypeLabel,
} from './_constants';
import type { CurriculumNodeItem } from '@/types';
import type { PaperDifficulty, PaperType } from '@/types/papers';
import type { CurriculumContextStatus } from '@/hooks/useCurriculumPreparation';
import { CheckCircle2, Loader2 as Spin } from 'lucide-react';

// ─── Step indicator ────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Topics' },
  { number: 2, label: 'Details' },
  { number: 3, label: 'Generate' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="New paper progress">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const complete = current > step.number;
          const active = current === step.number;
          return (
            <li key={step.number} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', complete && 'bg-primary text-primary-foreground', active && 'bg-primary text-primary-foreground ring-4 ring-primary/20', !complete && !active && 'bg-muted text-muted-foreground')}>
                  {complete ? <Check className="h-4 w-4" /> : step.number}
                </span>
                <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-foreground' : 'text-muted-foreground')}>{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn('hidden h-0.5 flex-1 rounded-full sm:block', complete ? 'bg-primary' : 'bg-muted')} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Context status badge ──────────────────────────────────────────────────

function ContextBadge({ status, error }: { status: CurriculumContextStatus; error: string | null }) {
  if (status === 'ready') return <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Ready</Badge>;
  if (status === 'preparing') return <Badge variant="outline" className="gap-1"><Spin className="h-3.5 w-3.5 animate-spin" />Preparing context</Badge>;
  if (status === 'error') return <span className="text-sm text-destructive">{error ?? 'Missing subject, grade, or term context.'}</span>;
  return null;
}

// ─── Main wizard ───────────────────────────────────────────────────────────

export function PapersNewWizard() {
  const router = useRouter();
  const { frameworks, selectedFramework, searchNodes, loadNode } = useCurriculumStructure();
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

  const handleTopicSelect = useCallback((node: CurriculumNodeItem) => {
    const nextContext = extractCurriculumContext(node);
    if (!nextContext) {
      toast.error('Choose a CAPS topic or subtopic that includes subject, grade, and term.');
      return;
    }
    setSelectedNodes((prev) => {
      const alreadySelected = prev.some((item) => item.id === node.id);
      const next = alreadySelected ? prev.filter((item) => item.id !== node.id) : [...prev, node];
      const primaryContext = prev[0] ? extractCurriculumContext(prev[0]) : nextContext;
      if (!alreadySelected && primaryContext && !contextsMatch(primaryContext, nextContext)) {
        toast.error('For one paper, choose topics from the same subject, grade, and term.');
        return prev;
      }
      prep.apply(next[0] ?? null);
      return next;
    });
  }, [prep]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setSelectedNodes((prev) => {
      const next = prev.filter((item) => item.id !== nodeId);
      prep.apply(next[0] ?? null);
      return next;
    });
  }, [prep]);

  const handleGenerate = useCallback(async () => {
    if (!prep.subjectId || !prep.gradeId || !prep.term) return;
    setGenerating(true);
    try {
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
  }, [prep.subjectId, prep.gradeId, prep.term, selectedTopicIds, paperYear, paperType, paperDuration, paperMarks, paperDifficulty, computedTitle, instructions, generatePaperWithAI, router]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Tree on the left — spans 2 of 3 cols on desktop */}
            <Card className="lg:col-span-2">
              <CardContent className="space-y-4">
                <Tabs defaultValue="browse">
                  <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList>
                  <TabsContent value="browse" className="mt-3">
                    <div className="max-h-[64vh] min-h-96 overflow-y-auto rounded-md border p-1">
                      <CurriculumTreeBrowser frameworkId={selectedFramework} selectedNodeId={prep.selectedNode?.id ?? null} selectedNodeIds={selectedNodes.map((n) => n.id)} onSelect={handleTopicSelect} />
                    </div>
                  </TabsContent>
                  <TabsContent value="search" className="mt-3">
                    <NodePicker frameworkId={selectedFramework} value={prep.selectedNode?.id ?? null} onChange={(_nodeId, node) => { if (node) handleTopicSelect(node); }} onSearch={searchNodes} onLoadNode={loadNode} placeholder="Search for a topic, subtopic, or assessment standard..." />
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
                        <span className="min-w-0 flex-1 text-sm leading-snug">{node.title}</span>
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

                <Button
                  className="w-full gap-1"
                  onClick={() => setStep(2)}
                  disabled={!canContinueFromTopics}
                >
                  Paper details<ChevronRight className="h-4 w-4" />
                </Button>
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
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
            <Button onClick={() => setStep(3)}>Review and Generate<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
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
                {selectedNodes.map((node) => <Badge key={node.id} variant="outline" className="max-w-full truncate">{node.title}</Badge>)}
              </div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{computedTitle}</p>
              <p className="text-muted-foreground">{paperTypeLabel(paperType)} — {paperMarks} marks — {paperDuration} min — {paperDifficulty}</p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
              <Button onClick={() => void handleGenerate()} disabled={generating} size="lg">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {generating ? 'Generating...' : 'Generate Paper with AI'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
