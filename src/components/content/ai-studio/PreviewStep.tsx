'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Clock,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { toast } from 'sonner';
import type {
  ContentResourceItem,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
  Grade,
  Subject,
} from '@/types';

interface PreviewStepProps {
  resource: ContentResourceItem;
  grades: Grade[];
  subjects: Subject[];
  onPublish: (id: string) => Promise<boolean>;
  onReview: (id: string, data: { action: 'approve'; notes?: string }) => Promise<boolean>;
  onRegenerate: () => void;
  onReset: () => void;
}

export function PreviewStep({
  resource,
  grades,
  subjects,
  onPublish,
  onReview,
  onRegenerate,
  onReset,
}: PreviewStepProps) {
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  const gradeName = useMemo(() => {
    if (typeof resource.gradeId === 'object') return resource.gradeId.name;
    return grades.find((g: Grade) => g.id === resource.gradeId)?.name ?? '';
  }, [resource.gradeId, grades]);

  const subjectName = useMemo(() => {
    if (typeof resource.subjectId === 'object') return resource.subjectId.name;
    return subjects.find((s: Subject) => s.id === resource.subjectId)?.name ?? '';
  }, [resource.subjectId, subjects]);

  const blockCount = resource.blocks.length;
  const interactiveCount = useMemo(
    () => resource.blocks.filter((b: ContentBlockItem) => b.type !== 'text' && b.type !== 'image').length,
    [resource.blocks],
  );

  const [interactions] = useState<Record<string, BlockInteractionState>>({});

  const getInteraction = useCallback(
    (blockId: string): BlockInteractionState =>
      interactions[blockId] ?? {
        blockId,
        answered: false,
        correct: null,
        score: 0,
        maxScore: 0,
        showExplanation: false,
        hintsRevealed: 0,
        attemptResult: null,
      },
    [interactions],
  );

  const handleAttempt = useCallback(
    async (_blockId: string, _response: string): Promise<AttemptResult> => ({
      id: 'preview',
      correct: false,
      score: 0,
      maxScore: 1,
      attemptNumber: 1,
    }),
    [],
  );

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const submitted = await onPublish(resource.id);
      if (submitted) {
        const approved = await onReview(resource.id, { action: 'approve' });
        if (approved) toast.success('Resource published successfully!');
      }
    } catch (err: unknown) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  }, [resource.id, onPublish, onReview]);

  const handleSaveDraft = useCallback(() => {
    setSaving(true);
    toast.success('Saved as draft in your Content Library');
    setTimeout(() => setSaving(false), 500);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary">{resource.type}</Badge>
                {gradeName && <Badge variant="outline">{gradeName}</Badge>}
                {subjectName && <Badge variant="outline">{subjectName}</Badge>}
                {resource.term > 0 && (
                  <Badge variant="outline">Term {resource.term}</Badge>
                )}
              </div>
              <CardTitle className="text-xl">{resource.title}</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1 shrink-0">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {blockCount} blocks
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              {interactiveCount} interactive
            </span>
            {resource.estimatedMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{resource.estimatedMinutes} min
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Blocks */}
      <div className="space-y-4">
        {resource.blocks.map((block: ContentBlockItem) => (
          <Card key={block.blockId}>
            <CardContent className="pt-4">
              <BlockRenderer
                block={block}
                onAttempt={handleAttempt}
                interaction={getInteraction(block.blockId)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onReset} className="text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Start Over
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Regenerate
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/teacher/curriculum/content-library`, '_blank')}
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            Content Library
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <CheckCircle className="mr-1 h-4 w-4" />
            {publishing ? 'Publishing...' : 'Approve & Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
