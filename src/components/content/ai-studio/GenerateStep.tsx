'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, BookOpen, Brain, PenTool, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CurriculumNodeItem, ResourceType, ContentBlockType, GenerateContentPayload, ContentResourceItem } from '@/types';

interface GenerateStepProps {
  selectedNode: CurriculumNodeItem;
  resourceType: ResourceType;
  subjectId: string;
  gradeId: string;
  term: number;
  difficulty: number;
  instructions: string;
  onGenerate: (payload: GenerateContentPayload) => Promise<ContentResourceItem | null>;
  onComplete: (resource: ContentResourceItem) => void;
  onBack: () => void;
}

const PROGRESS_STEPS = [
  { icon: BookOpen, text: 'Analysing CAPS curriculum requirements...', delay: 0 },
  { icon: Brain, text: 'Creating lesson content with worked examples...', delay: 2500 },
  { icon: PenTool, text: 'Adding interactive exercises & quizzes...', delay: 5500 },
  { icon: CheckCircle2, text: 'Finalising and saving...', delay: 8000 },
];

const BLOCK_TYPES_BY_RESOURCE: Record<ResourceType, ContentBlockType[]> = {
  lesson: ['text', 'quiz', 'fill_blank', 'step_reveal', 'image'],
  worksheet: ['text', 'quiz', 'fill_blank', 'match_columns', 'ordering'],
  activity: ['text', 'quiz', 'fill_blank', 'match_columns', 'image'],
  study_notes: ['text', 'quiz', 'fill_blank', 'image', 'step_reveal'],
  worked_example: ['text', 'quiz', 'fill_blank', 'step_reveal', 'image'],
};

export function GenerateStep({
  selectedNode,
  resourceType,
  subjectId,
  gradeId,
  term,
  difficulty,
  instructions,
  onGenerate,
  onComplete,
  onBack,
}: GenerateStepProps) {
  const [generating, setGenerating] = useState(false);
  const [activeProgressStep, setActiveProgressStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generating) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    PROGRESS_STEPS.forEach((_, idx) => {
      const t = setTimeout(() => setActiveProgressStep(idx), PROGRESS_STEPS[idx].delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setActiveProgressStep(0);
    try {
      const payload: GenerateContentPayload = {
        curriculumNodeId: selectedNode.id,
        type: resourceType,
        gradeId,
        subjectId,
        term,
        blockTypes: BLOCK_TYPES_BY_RESOURCE[resourceType] ?? ['text', 'quiz'],
        difficulty,
        instructions: instructions || undefined,
      };
      const result = await onGenerate(payload);
      if (result) {
        setActiveProgressStep(PROGRESS_STEPS.length);
        setTimeout(() => onComplete(result), 600);
      } else {
        setError('Generation failed. Please try again.');
        setGenerating(false);
        setActiveProgressStep(-1);
      }
    } catch (err: unknown) {
      console.error('Generate failed:', err);
      setError('Something went wrong. Please try again.');
      setGenerating(false);
      setActiveProgressStep(-1);
    }
  }, [selectedNode, resourceType, gradeId, subjectId, term, difficulty, instructions, onGenerate, onComplete]);

  return (
    <div className="flex flex-col items-center space-y-8 py-8">
      {/* Topic summary */}
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-xs">{selectedNode.type}</Badge>
        <h2 className="text-xl font-semibold">{selectedNode.title}</h2>
        <p className="text-sm text-muted-foreground">
          Generating a <span className="font-medium text-foreground">{resourceType}</span> resource
        </p>
      </div>

      {/* Generate button or progress */}
      {!generating && !error && (
        <Button
          size="lg"
          onClick={handleGenerate}
          className="group relative h-16 gap-3 rounded-2xl px-10 text-lg font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
        >
          <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
          Generate with AI
        </Button>
      )}

      {generating && (
        <div className="w-full max-w-md space-y-4">
          {PROGRESS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeProgressStep;
            const isComplete = idx < activeProgressStep;
            const isPending = idx > activeProgressStep;
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-3 transition-all duration-500',
                  isActive && 'bg-primary/5',
                  isComplete && 'opacity-60',
                  isPending && 'opacity-30',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                    isActive && 'bg-primary text-primary-foreground animate-pulse',
                    isComplete && 'bg-primary/20 text-primary',
                    isPending && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={cn('text-sm', isActive && 'font-medium')}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="mr-1 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {!generating && !error && (
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to configuration
        </Button>
      )}
    </div>
  );
}
