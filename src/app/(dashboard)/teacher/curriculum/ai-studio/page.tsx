'use client';

import { useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  StepIndicator,
  TopicStep,
  ConfigStep,
  GenerateStep,
  PreviewStep,
} from '@/components/content/ai-studio';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import type {
  CurriculumNodeItem,
  ContentResourceItem,
  ResourceType,
  GenerateContentPayload,
} from '@/types';

export default function AiStudioPage() {
  const { frameworks, selectedFramework, loading: fwLoading, searchNodes, loadNode } =
    useCurriculumStructure();
  const { generateContent, submitForReview, reviewResource, refineResource, updateResource } = useContentLibrary();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { grades, loading: gradesLoading } = useGrades();

  // ─── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ─── Step 1: Topic ──────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);

  // ─── Step 2: Config ─────────────────────────────────────────────────────────
  const [resourceType, setResourceType] = useState<ResourceType>('lesson');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [term, setTerm] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [instructions, setInstructions] = useState('');

  // ─── Step 4: Preview ────────────────────────────────────────────────────────
  const [generatedResource, setGeneratedResource] = useState<ContentResourceItem | null>(null);

  const handleNodeChange = useCallback(
    (nodeId: string | null, node: CurriculumNodeItem | null) => {
      setSelectedNodeId(nodeId);
      setSelectedNode(node);
    },
    [],
  );

  const handleGenerate = useCallback(
    async (payload: GenerateContentPayload): Promise<ContentResourceItem | null> => {
      return generateContent(payload);
    },
    [generateContent],
  );

  const handleGenerateComplete = useCallback((resource: ContentResourceItem) => {
    setGeneratedResource(resource);
    setStep(4);
  }, []);

  const handleRegenerate = useCallback(() => {
    setGeneratedResource(null);
    setStep(3);
  }, []);

  const handleResourceUpdated = useCallback((resource: ContentResourceItem) => {
    setGeneratedResource(resource);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedNodeId(null);
    setSelectedNode(null);
    setResourceType('lesson');
    setSubjectId('');
    setGradeId('');
    setTerm(0);
    setDifficulty(3);
    setInstructions('');
    setGeneratedResource(null);
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (fwLoading || subjectsLoading || gradesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Studio"
        description="Generate complete, curriculum-aligned lessons with one click"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Powered by AI
        </div>
      </PageHeader>

      <StepIndicator currentStep={step} />

      <div className="mx-auto max-w-3xl">
        {step === 1 && (
          <TopicStep
            frameworks={frameworks}
            selectedFramework={selectedFramework}
            selectedNodeId={selectedNodeId}
            selectedNode={selectedNode}
            onNodeChange={handleNodeChange}
            onSearch={searchNodes}
            onLoadNode={loadNode}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <ConfigStep
            resourceType={resourceType}
            onResourceTypeChange={setResourceType}
            subjectId={subjectId}
            onSubjectChange={setSubjectId}
            gradeId={gradeId}
            onGradeChange={setGradeId}
            term={term}
            onTermChange={setTerm}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            instructions={instructions}
            onInstructionsChange={setInstructions}
            subjects={subjects}
            grades={grades}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && selectedNode && (
          <GenerateStep
            selectedNode={selectedNode}
            resourceType={resourceType}
            subjectId={subjectId}
            gradeId={gradeId}
            term={term}
            difficulty={difficulty}
            instructions={instructions}
            onGenerate={handleGenerate}
            onComplete={handleGenerateComplete}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && generatedResource && (
          <PreviewStep
            resource={generatedResource}
            grades={grades}
            subjects={subjects}
            onPublish={submitForReview}
            onReview={reviewResource}
            onRefine={refineResource}
            onRegenerate={handleRegenerate}
            onReset={handleReset}
            onResourceUpdated={handleResourceUpdated}
            onUpdateResource={updateResource}
          />
        )}
      </div>
    </div>
  );
}
