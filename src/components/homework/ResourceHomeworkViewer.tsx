'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, Layers } from 'lucide-react';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { RESOURCE_TYPE_LABELS } from '@/lib/design-system';
import type {
  HomeworkResource,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
  ResourceType,
} from '@/types';

// ─── Props ─────────────────────────────────────────────────────────────────

interface ResourceHomeworkViewerProps {
  resource: HomeworkResource;
  submitted: boolean;
  isOverdue: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ResourceHomeworkViewer({
  resource,
  submitted,
  isOverdue,
  submitting,
  onSubmit,
}: ResourceHomeworkViewerProps) {
  const [interactions, setInteractions] = useState<Record<string, BlockInteractionState>>({});

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
    async (blockId: string, _response: string): Promise<AttemptResult> => {
      const result: AttemptResult = {
        id: blockId,
        correct: true,
        score: 1,
        maxScore: 1,
        attemptNumber: 1,
      };
      setInteractions((prev) => ({
        ...prev,
        [blockId]: {
          ...getInteraction(blockId),
          answered: true,
          correct: result.correct,
          score: result.score,
          maxScore: result.maxScore,
          attemptResult: result,
        },
      }));
      return result;
    },
    [getInteraction],
  );

  const interactiveBlocks = resource.blocks.filter(
    (b: ContentBlockItem) => b.type !== 'text' && b.type !== 'image',
  );

  const answeredCount = Object.values(interactions).filter(
    (i: BlockInteractionState) => i.answered,
  ).length;

  const allAnswered = interactiveBlocks.length > 0
    ? answeredCount >= interactiveBlocks.length
    : true;

  return (
    <div className="space-y-4">
      {/* Resource header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Learning Resource</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {RESOURCE_TYPE_LABELS[resource.type as ResourceType] ?? resource.type}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                {resource.blocks.length} blocks
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Interactive blocks */}
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

      {/* Submit button */}
      {!submitted && (
        <Card>
          <CardContent className="space-y-3">
            {interactiveBlocks.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Progress: {answeredCount} / {interactiveBlocks.length} interactive blocks completed
              </p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={onSubmit}
                disabled={isOverdue || submitting || !allAnswered}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Homework'}
              </Button>
            </div>
            {isOverdue && (
              <p className="text-sm text-destructive">
                This homework is past due. Late submissions are not accepted.
              </p>
            )}
            {!allAnswered && !isOverdue && (
              <p className="text-sm text-muted-foreground">
                Complete all interactive blocks before submitting.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
