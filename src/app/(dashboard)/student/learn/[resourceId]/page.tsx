'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useStudentLearning } from '@/hooks/useStudentLearning';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  ContentResourceItem,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
} from '@/types';

// Blocks that can be answered interactively
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

export default function StudentLessonPage() {
  const params = useParams();
  const resourceId = params.resourceId as string;
  const { getResource, submitAttempt } = useStudentLearning();
  const { student } = useCurrentStudent();

  const [resource, setResource] = useState<ContentResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(
    new Map(),
  );
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

  // Load resource
  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getResource(resourceId);
        if (cancelled) return;
        setResource(data);

        // Initialize interaction state for interactive blocks
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

  // Handle an attempt for a block
  const handleAttempt = useCallback(
    async (blockId: string, response: string): Promise<AttemptResult> => {
      if (!student?.id) {
        throw new Error('Student not loaded');
      }

      const payload = {
        blockId,
        curriculumNodeId:
          typeof resource?.curriculumNodeId === 'string'
            ? resource.curriculumNodeId
            : resource?.curriculumNodeId?.id ?? '',
        response,
        timeSpentSeconds: 0,
        hintsUsed: interactionsRef.current.get(blockId)?.hintsRevealed ?? 0,
      };

      const result = await submitAttempt(resourceId, student.id, payload);

      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          blockId,
          answered: true,
          correct: result.correct,
          score: result.score,
          maxScore: result.maxScore,
          showExplanation: true,
          hintsRevealed: prev.get(blockId)?.hintsRevealed ?? 0,
          attemptResult: result,
        });
        return next;
      });

      if (result.correct) {
        toast.success(`Correct! ${result.score}/${result.maxScore}`);
      } else {
        toast.error(`Not quite. ${result.score}/${result.maxScore}`);
      }

      return result;
    },
    [resource, resourceId, submitAttempt, student?.id],
  );

  // Progress tracking
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
        description="This lesson may have been removed or is no longer available."
        action={
          <Link href="/student/learn">
            <Button variant="outline">Back to Learn</Button>
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
        <Link href="/student/learn">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <PageHeader title={resource.title} />
        </div>
      </div>

      {/* Progress bar */}
      {totalInteractive > 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle className="size-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">
                  {completedCount} of {totalInteractive} blocks completed
                </span>
                <Badge variant={completedCount === totalInteractive ? 'default' : 'secondary'}>
                  {Math.round((completedCount / totalInteractive) * 100)}%
                </Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.round((completedCount / totalInteractive) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks */}
      <div className="space-y-4">
        {sortedBlocks.map((block: ContentBlockItem) => (
          <Card key={block.blockId}>
            <CardContent>
              <BlockRenderer
                block={block}
                onAttempt={handleAttempt}
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
        <Link href="/student/learn">
          <Button variant="outline" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back to Topics
          </Button>
        </Link>
      </div>
    </div>
  );
}
