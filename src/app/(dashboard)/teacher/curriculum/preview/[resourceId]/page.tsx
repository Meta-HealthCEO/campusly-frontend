'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  ContentResourceItem,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
} from '@/types';

const INTERACTIVE_TYPES = new Set(['quiz', 'fill_blank', 'match_columns', 'ordering']);

function createDefaultInteraction(blockId: string): BlockInteractionState {
  return {
    blockId,
    answered: false,
    correct: null,
    score: 0,
    maxScore: 0,
    showExplanation: false,
    hintsRevealed: 0,
    attemptResult: null,
  };
}

export default function TeacherPreviewResourcePage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.resourceId as string;
  const { getResource } = useContentLibrary();

  const [resource, setResource] = useState<ContentResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(
    new Map(),
  );

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getResource(resourceId);
        if (cancelled || !data) return;
        setResource(data);

        const map = new Map<string, BlockInteractionState>();
        (data.blocks ?? []).forEach((block: ContentBlockItem) => {
          if (INTERACTIVE_TYPES.has(block.type)) {
            map.set(block.blockId, createDefaultInteraction(block.blockId));
          }
        });
        setInteractions(map);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Failed to load resource', err);
          toast.error(extractErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [resourceId, getResource]);

  // Preview-mode attempt handler — shows correct answer without saving
  const handlePreviewAttempt = async (
    blockId: string,
    _response: string,
  ): Promise<AttemptResult> => {
    const result: AttemptResult = {
      id: `preview-${blockId}`,
      correct: true,
      score: 1,
      maxScore: 1,
      attemptNumber: 1,
    };

    setInteractions((prev) => {
      const next = new Map(prev);
      next.set(blockId, {
        blockId,
        answered: true,
        correct: true,
        score: 1,
        maxScore: 1,
        showExplanation: true,
        hintsRevealed: 0,
        attemptResult: result,
      });
      return next;
    });

    toast.info('Preview mode — student answers would be graded here');
    return result;
  };

  const { completedCount, totalInteractive } = useMemo(() => {
    let completed = 0;
    let total = 0;
    interactions.forEach((state: BlockInteractionState) => {
      total += 1;
      if (state.answered) completed += 1;
    });
    return { completedCount: completed, totalInteractive: total };
  }, [interactions]);

  if (loading) return <LoadingSpinner />;

  if (!resource) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Resource not found"
        description="This resource may have been removed."
        action={
          <Link href="/teacher/curriculum/preview">
            <Button variant="outline">Back to Preview</Button>
          </Link>
        }
      />
    );
  }

  const sortedBlocks = [...resource.blocks].sort(
    (a: ContentBlockItem, b: ContentBlockItem) => a.order - b.order,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader title={resource.title} />
        </div>
        <Badge variant="outline" className="gap-1 shrink-0">
          <Eye className="size-3" />
          Preview
        </Badge>
      </div>

      {/* Preview mode banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Eye className="size-4 text-primary shrink-0" />
          <span>
            <strong>Teacher Preview</strong> — This is how students see this resource.
            Interactive blocks are viewable but answers are not recorded.
          </span>
        </CardContent>
      </Card>

      {/* Resource metadata */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{resource.type}</Badge>
        {resource.term && <Badge variant="outline">Term {resource.term}</Badge>}
        {resource.estimatedMinutes && (
          <Badge variant="outline">{resource.estimatedMinutes} min</Badge>
        )}
        <Badge variant="outline">{resource.blocks.length} blocks</Badge>
      </div>

      {/* Progress bar for interactive blocks */}
      {totalInteractive > 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">
                  {completedCount} of {totalInteractive} interactive blocks
                </span>
                <Badge variant={completedCount === totalInteractive ? 'default' : 'secondary'}>
                  {Math.round((completedCount / totalInteractive) * 100)}%
                </Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${totalInteractive > 0 ? Math.round((completedCount / totalInteractive) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content blocks */}
      <div className="space-y-4">
        {sortedBlocks.map((block: ContentBlockItem) => (
          <Card key={block.blockId}>
            <CardContent>
              <BlockRenderer
                block={block}
                onAttempt={handlePreviewAttempt}
                interaction={
                  interactions.get(block.blockId) ??
                  createDefaultInteraction(block.blockId)
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex justify-between">
        <Button variant="outline" className="gap-1.5" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
