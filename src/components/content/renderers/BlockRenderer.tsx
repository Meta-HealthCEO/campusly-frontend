'use client';

import { useCallback } from 'react';
import { TextBlock } from './TextBlock';
import { QuizBlock } from './QuizBlock';
import { FillBlankBlock } from './FillBlankBlock';
import { MatchColumnsBlock } from './MatchColumnsBlock';
import { OrderingBlock } from './OrderingBlock';
import { StepRevealBlock } from './StepRevealBlock';
import { AlertCircle } from 'lucide-react';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

interface BlockRendererProps {
  block: ContentBlockItem;
  onAttempt: (blockId: string, response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function BlockRenderer({ block, onAttempt, interaction }: BlockRendererProps) {
  const handleSubmit = useCallback(
    async (response: string) => onAttempt(block.blockId, response),
    [onAttempt, block.blockId],
  );

  switch (block.type) {
    case 'text':
      return <TextBlock block={block} />;

    case 'quiz':
      return <QuizBlock block={block} onSubmit={handleSubmit} interaction={interaction} />;

    case 'fill_blank':
      return <FillBlankBlock block={block} onSubmit={handleSubmit} interaction={interaction} />;

    case 'match_columns':
      return (
        <MatchColumnsBlock block={block} onSubmit={handleSubmit} interaction={interaction} />
      );

    case 'ordering':
      return <OrderingBlock block={block} onSubmit={handleSubmit} interaction={interaction} />;

    case 'step_reveal':
      return <StepRevealBlock block={block} />;

    case 'image':
      return (
        <div className="rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.content}
            alt={block.metadata?.alt as string ?? 'Content image'}
            className="w-full h-auto max-h-96 object-contain"
          />
        </div>
      );

    case 'video':
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
          <iframe
            src={block.content}
            title={block.metadata?.title as string ?? 'Video content'}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This content type ({block.type}) is not yet supported.
        </div>
      );
  }
}
