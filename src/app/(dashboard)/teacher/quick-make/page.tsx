'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronRight, FileQuestion, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PreviewStep } from '@/components/content/ai-studio';
import { AssignHomeworkDialog } from '@/components/homework/AssignHomeworkDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAssignHomework } from '@/hooks/useAssignHomework';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useCurriculumPreparation, extractCurriculumContext, contextsMatch } from '@/hooks/useCurriculumPreparation';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AssignHomeworkFormValues } from '@/components/homework/AssignHomeworkDialog';
import type { ContentResourceItem, CurriculumFrameworkItem, CurriculumNodeItem, GenerateContentPayload, ResourceType, UpdateResourcePayload } from '@/types';
import type { BloomsLevel, CapsLevel, CognitiveLevelPair, QuestionItem, QuestionType } from '@/types/question-bank';
import type { PaperDifficulty, PaperType } from '@/types/papers';
import { UnifiedStepIndicator } from './_ui';
import { StepCurriculum } from './_StepCurriculum';
import { StepDetails } from './_StepDetails';
import { type CreationKind, OUTPUTS, BLOCK_TYPES_BY_RESOURCE, paperTypeLabel, buildPaperSections } from './_constants';

type StudioResult =
  | { kind: 'resource'; resource: ContentResourceItem }
  | { kind: 'paper'; id: string; title: string }
  | { kind: 'questions'; count: number };

export default function AiStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToolHandledRef = useRef(false);
  const { user, permissions } = useAuthStore();
  const { frameworks, selectedFramework, loading: frameworksLoading, searchNodes, loadNode } = useCurriculumStructure();
  const { generateContent, submitForReview, reviewResource, refineResource, updateResource } = useContentLibrary();
  const { generatePaperWithAI } = useTeacherPapers(false);
  const { subjects } = useSubjects();
  const { grades } = useGrades();
  const { classes, assignHomework } = useAssignHomework();
  const prep = useCurriculumPreparation();

  const [step, setStep] = useState(1);
  const [selectedOutput, setSelectedOutput] = useState<CreationKind | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<CurriculumNodeItem[]>([]);
  const [resourceType, setResourceType] = useState<ResourceType>('lesson');
  const [difficulty, setDifficulty] = useState(3);
  const [instructions, setInstructions] = useState('');
  const [paperType, setPaperType] = useState<PaperType>('class_test');
  const [paperTitle, setPaperTitle] = useState('');
  const [paperMarks, setPaperMarks] = useState(50);
  const [paperDuration, setPaperDuration] = useState(60);
  const [paperDifficulty, setPaperDifficulty] = useState<PaperDifficulty>('medium');
  const [paperYear, setPaperYear] = useState(new Date().getFullYear());
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionCapsLevel, setQuestionCapsLevel] = useState<CapsLevel>('knowledge');
  const [questionBloomsLevel, setQuestionBloomsLevel] = useState<BloomsLevel>('understand');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignResource, setAssignResource] = useState<ContentResourceItem | null>(null);

  const canApproveResources = user?.role === 'school_admin' || user?.role === 'super_admin' || permissions.isHOD || permissions.isSchoolPrincipal;
  const selectedTopicIds = selectedNodes.map((n) => n.id);
  const selectedOutputMeta = OUTPUTS.find((o) => o.kind === selectedOutput);
  const allowMultipleTopics = selectedOutput === 'paper';
  const selectedFrameworkMeta = frameworks.find((f: CurriculumFrameworkItem) => f.id === selectedFramework);

  const computedPaperTitle = useMemo(() => {
    const explicit = paperTitle.trim();
    return explicit || `Term ${prep.term || 1} ${paperTypeLabel(paperType)} ${paperYear}`;
  }, [paperTitle, paperType, paperYear, prep.term]);

  const canContinueFromCurriculum = selectedOutput !== null && selectedNodes.length > 0 && prep.contextStatus === 'ready' && Boolean(prep.subjectId && prep.gradeId && prep.term);
  const canGenerate = canContinueFromCurriculum && !generating;

  const clearCurriculumSelection = useCallback(() => { setSelectedNodes([]); prep.apply(null); }, [prep]);

  const resetFlow = useCallback(() => {
    setStep(1); setSelectedOutput(null); clearCurriculumSelection();
    setResourceType('lesson'); setDifficulty(3); setInstructions('');
    setPaperType('class_test'); setPaperTitle(''); setPaperMarks(50);
    setPaperDuration(60); setPaperDifficulty('medium'); setPaperYear(new Date().getFullYear());
    setQuestionType('mcq'); setQuestionCount(5); setQuestionCapsLevel('knowledge');
    setQuestionBloomsLevel('understand'); setResult(null);
  }, [clearCurriculumSelection]);

  const chooseOutput = useCallback((kind: CreationKind) => {
    setSelectedOutput(kind); setResult(null); clearCurriculumSelection();
    if (kind === 'homework') setResourceType('worksheet');
    setStep(2);
  }, [clearCurriculumSelection]);

  useEffect(() => {
    if (initialToolHandledRef.current) return;
    const tool = searchParams.get('tool');
    const mapped: Partial<Record<string, CreationKind>> = { paper: 'paper', resource: 'resource', homework: 'homework', questions: 'questions' };
    if (!tool || !mapped[tool]) return;
    initialToolHandledRef.current = true;
    chooseOutput(mapped[tool]);
    router.replace('/teacher/quick-make');
  }, [chooseOutput, router, searchParams]);

  const handleTopicSelect = useCallback((node: CurriculumNodeItem) => {
    const nextContext = extractCurriculumContext(node);
    if (!nextContext) { toast.error('Choose a CAPS topic or subtopic that includes subject, grade, and term.'); return; }
    setSelectedNodes((prev) => {
      if (!allowMultipleTopics) { const next = [node]; prep.apply(next[0] ?? null); return next; }
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
  }, [allowMultipleTopics, prep]);

  const handleAssignClick = useCallback((resource: ContentResourceItem) => { setAssignResource(resource); setAssignOpen(true); }, []);

  const handleAssignSubmit = useCallback(async (formData: AssignHomeworkFormValues) => {
    if (!assignResource) return;
    const resourceSubjectId = typeof assignResource.subjectId === 'string' ? assignResource.subjectId : assignResource.subjectId.id;
    const success = await assignHomework({ resourceId: assignResource.id, resourceTitle: assignResource.title, subjectId: resourceSubjectId, formData });
    if (success) { setAssignOpen(false); setAssignResource(null); }
  }, [assignHomework, assignResource]);

  const handleGenerate = useCallback(async () => {
    if (!selectedOutput || !prep.selectedNode || !canGenerate) return;
    setGenerating(true); setResult(null);
    try {
      if (selectedOutput === 'resource' || selectedOutput === 'homework') {
        const payload: GenerateContentPayload = { curriculumNodeId: prep.selectedNode.id, type: resourceType, gradeId: prep.gradeId, subjectId: prep.subjectId, term: prep.term, blockTypes: BLOCK_TYPES_BY_RESOURCE[resourceType], difficulty, instructions: instructions.trim() || undefined };
        const resource = await generateContent(payload);
        if (resource) { setResult({ kind: 'resource', resource }); setStep(4); if (selectedOutput === 'homework') { setAssignResource(resource); setAssignOpen(true); } }
        return;
      }
      if (selectedOutput === 'paper') {
        const generated = await generatePaperWithAI({ subjectId: prep.subjectId, gradeId: prep.gradeId, topicIds: selectedTopicIds, term: prep.term, year: paperYear, paperType, duration: paperDuration, totalMarks: paperMarks, difficulty: paperDifficulty, title: computedPaperTitle, sectionConfig: buildPaperSections(paperMarks), instructions: instructions.trim() || undefined });
        if (generated?.paperId) { setResult({ kind: 'paper', id: generated.paperId, title: computedPaperTitle }); setStep(4); }
        return;
      }
      if (selectedOutput === 'questions') {
        const cognitiveLevel: CognitiveLevelPair = { caps: questionCapsLevel, blooms: questionBloomsLevel };
        const response = await apiClient.post('/question-bank/questions/generate', { curriculumNodeId: prep.selectedNode.id, subjectId: prep.subjectId, gradeId: prep.gradeId, type: questionType, count: questionCount, difficulty, cognitiveLevel, gradeLevel: prep.curriculumContext?.gradeLevel });
        const questions = unwrapResponse<QuestionItem[]>(response);
        const count = Array.isArray(questions) ? questions.length : 0;
        setResult({ kind: 'questions', count });
        toast.success(`Generated ${count} question${count === 1 ? '' : 's'}`);
        setStep(4);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  }, [selectedOutput, prep.selectedNode, canGenerate, resourceType, prep.gradeId, prep.subjectId, prep.term, difficulty, instructions, generateContent, selectedTopicIds, paperYear, paperType, paperDuration, paperMarks, paperDifficulty, computedPaperTitle, generatePaperWithAI, questionCapsLevel, questionBloomsLevel, questionType, questionCount, prep.curriculumContext?.gradeLevel]);

  if (!user?.schoolId) return <EmptyState icon={AlertTriangle} title="School not configured" description="Complete setup before using Quick Make." />;
  if (frameworksLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Quick Make" description="Generate a single material without creating a Lesson. For richer lesson management, use the Lesson Workspace →">
        {step > 1 && <Button variant="outline" onClick={resetFlow}>Start Over</Button>}
      </PageHeader>
      <UnifiedStepIndicator currentStep={step} />
      <div className="mx-auto max-w-5xl space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <Card className="flex flex-col items-start justify-between gap-3 border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-medium">Looking for the new Lesson Workspace?</h3>
                <p className="text-sm text-muted-foreground">Plan a complete lesson with all materials in one place.</p>
              </div>
              <Link href="/teacher/lessons"><Button>Open Workspace</Button></Link>
            </Card>
            <div>
              <h2 className="text-xl font-semibold">What are you preparing?</h2>
              <p className="text-sm text-muted-foreground">Pick the teaching task first. Every option uses the same curriculum picker and guided setup.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OUTPUTS.map((output) => {
                const Icon = output.icon;
                return (
                  <button key={output.kind} type="button" onClick={() => { if (output.kind === 'lesson_plan') { router.push('/teacher/lessons/new'); return; } chooseOutput(output.kind); }} className="group h-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-muted/40">
                      <CardContent className="flex h-full flex-col gap-4 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">{output.title}</h3>
                              {output.badge && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{output.badge}</Badge>}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{output.description}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{output.destination}</span>
                          <span className="inline-flex items-center gap-1 font-medium text-primary">Continue <ChevronRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 2 && selectedOutput && (
          <StepCurriculum
            outputTitle={selectedOutputMeta?.title}
            allowMultipleTopics={allowMultipleTopics}
            frameworkName={selectedFrameworkMeta?.name ?? 'CAPS'}
            selectedFramework={selectedFramework}
            selectedNodes={selectedNodes}
            selectedNodeId={prep.selectedNode?.id ?? null}
            contextStatus={prep.contextStatus}
            contextError={prep.contextError}
            canContinue={canContinueFromCurriculum}
            onTopicSelect={handleTopicSelect}
            onRemoveNode={(nodeId) => { const next = selectedNodes.filter((item) => item.id !== nodeId); setSelectedNodes(next); prep.apply(next[0] ?? null); }}
            onSearch={searchNodes}
            onLoadNode={loadNode}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && selectedOutput && (
          <StepDetails
            selectedOutput={selectedOutput} outputTitle={selectedOutputMeta?.title} curriculumContext={prep.curriculumContext} term={prep.term}
            resourceType={resourceType} difficulty={difficulty} instructions={instructions}
            paperType={paperType} paperTitle={paperTitle} paperMarks={paperMarks} paperDuration={paperDuration} paperDifficulty={paperDifficulty} paperYear={paperYear} computedPaperTitle={computedPaperTitle}
            questionType={questionType} questionCount={questionCount} questionCapsLevel={questionCapsLevel} questionBloomsLevel={questionBloomsLevel}
            canGenerate={canGenerate}
            onResourceType={setResourceType} onDifficulty={setDifficulty} onInstructions={setInstructions}
            onPaperType={setPaperType} onPaperTitle={setPaperTitle} onPaperMarks={setPaperMarks} onPaperDuration={setPaperDuration} onPaperDifficulty={setPaperDifficulty} onPaperYear={setPaperYear}
            onQuestionType={setQuestionType} onQuestionCount={setQuestionCount} onQuestionCapsLevel={setQuestionCapsLevel} onQuestionBloomsLevel={setQuestionBloomsLevel}
            onBack={() => setStep(2)} onNext={() => setStep(4)}
          />
        )}
        {step === 4 && !result && selectedOutput && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Badge variant="outline">{selectedOutputMeta?.title}</Badge><Badge variant="secondary">{selectedTopicIds.length} topic{selectedTopicIds.length === 1 ? '' : 's'}</Badge></div>
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
                <div className="mt-2 flex flex-wrap gap-2">{selectedNodes.map((node) => <Badge key={node.id} variant="outline" className="max-w-full truncate">{node.title}</Badge>)}</div>
              </div>
              {user?.isStandaloneTeacher && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Delivery mode: Print/PDF first</p>
                  <p className="mt-1 text-muted-foreground">This works without learners on Campusly. You can print, save as PDF, or add learners later for online assignments.</p>
                </div>
              )}
              {selectedOutput === 'paper' && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{computedPaperTitle}</p>
                  <p className="text-muted-foreground">{paperTypeLabel(paperType)} - {paperMarks} marks - {paperDuration} minutes - {paperDifficulty}</p>
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={() => void handleGenerate()} disabled={!canGenerate} size="lg">
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {generating ? 'Generating...' : `Generate ${selectedOutputMeta?.title ?? 'with AI'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 4 && result?.kind === 'resource' && (
          <PreviewStep resource={result.resource} grades={grades} subjects={subjects} onPublish={submitForReview} onReview={reviewResource} canApprove={canApproveResources} showPublishActions={!user?.isStandaloneTeacher} assignLabel={selectedOutput === 'homework' ? 'Assign Homework' : 'Assign as Homework'} onRefine={refineResource} onRegenerate={() => { setResult(null); setStep(4); }} onReset={resetFlow} onResourceUpdated={(resource) => setResult({ kind: 'resource', resource })} onUpdateResource={updateResource as (id: string, data: UpdateResourcePayload) => Promise<ContentResourceItem | null>} onAssign={handleAssignClick} />
        )}
        {step === 4 && result && result.kind !== 'resource' && (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {result.kind === 'paper' && <FileText className="h-6 w-6" />}
                {result.kind === 'questions' && <FileQuestion className="h-6 w-6" />}
              </div>
              <div>
                <Badge variant="outline">{result.kind === 'paper' ? 'Saved to Test Papers' : 'Saved to Practice Questions'}</Badge>
                <h2 className="mt-3 text-xl font-semibold">{result.kind === 'questions' ? `${result.count} question${result.count === 1 ? '' : 's'} generated` : result.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Saved and ready for your next teaching step.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.kind === 'paper' && <Button onClick={() => router.push(`/teacher/papers/${result.id}`)}>Open Paper and Memo</Button>}
                {result.kind === 'questions' && <Button onClick={() => router.push('/teacher/curriculum/questions')}>Open Practice Questions</Button>}
                <Button variant="outline" onClick={resetFlow}>Create Another</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {assignResource && (
        <AssignHomeworkDialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) setAssignResource(null); }} resourceTitle={assignResource.title} resourceType={assignResource.type} classes={classes} onSubmit={handleAssignSubmit} />
      )}
    </div>
  );
}
