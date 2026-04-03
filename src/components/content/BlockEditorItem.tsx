'use client';

import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContentBlockItem, ContentBlockType } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  quiz: 'Quiz',
  drag_drop: 'Drag & Drop',
  fill_blank: 'Fill Blank',
  match_columns: 'Match Columns',
  ordering: 'Ordering',
  hotspot: 'Hotspot',
  step_reveal: 'Step Reveal',
  code: 'Code',
};

const INTERACTIVE_TYPES: ContentBlockType[] = [
  'quiz',
  'drag_drop',
  'fill_blank',
  'match_columns',
  'ordering',
  'hotspot',
  'step_reveal',
];

function isInteractive(type: ContentBlockType): boolean {
  return INTERACTIVE_TYPES.includes(type);
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface BlockEditorItemProps {
  block: ContentBlockItem;
  index: number;
  totalBlocks: number;
  onUpdate: (blockId: string, patch: Partial<ContentBlockItem>) => void;
  onRemove: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BlockEditorItem({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockEditorItemProps) {
  const contentPlaceholder = isInteractive(block.type)
    ? 'Enter JSON config...'
    : 'Enter markdown content...';

  return (
    <div className="rounded-lg border bg-card p-3">
      {/* Toolbar row */}
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
        <Badge variant="secondary">{BLOCK_TYPE_LABELS[block.type]}</Badge>
        <span className="text-xs text-muted-foreground">#{index + 1}</span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMoveUp(block.blockId)}
            aria-label="Move up"
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === totalBlocks - 1}
            onClick={() => onMoveDown(block.blockId)}
            aria-label="Move down"
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(block.blockId)}
            aria-label="Delete block"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`block-content-${block.blockId}`}>Content</Label>
          <Textarea
            id={`block-content-${block.blockId}`}
            rows={4}
            placeholder={contentPlaceholder}
            value={block.content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onUpdate(block.blockId, { content: e.target.value })
            }
          />
        </div>

        {/* Points + Explanation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`block-points-${block.blockId}`}>Points</Label>
            <Input
              id={`block-points-${block.blockId}`}
              type="number"
              min={0}
              value={block.points}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(block.blockId, { points: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor={`block-explanation-${block.blockId}`}>
              Explanation
            </Label>
            <Input
              id={`block-explanation-${block.blockId}`}
              placeholder="Brief explanation..."
              value={block.explanation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(block.blockId, { explanation: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
