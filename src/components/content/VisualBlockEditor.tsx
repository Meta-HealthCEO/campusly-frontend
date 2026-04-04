'use client';

import { useCallback } from 'react';
import { Plus, Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VisualBlockEditorItem } from './VisualBlockEditorItem';
import { BLOCK_TYPE_ENTRIES } from '@/lib/design-system';
import type { ContentBlockItem, ContentBlockType } from '@/types';

function createBlock(type: ContentBlockType, order: number): ContentBlockItem {
  return {
    blockId: crypto.randomUUID(),
    type,
    order,
    content: '',
    curriculumNodeId: null,
    cognitiveLevel: null,
    points: 0,
    hints: [],
    explanation: '',
    metadata: {},
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface VisualBlockEditorProps {
  blocks: ContentBlockItem[];
  onChange: (blocks: ContentBlockItem[]) => void;
  readOnly?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VisualBlockEditor({
  blocks,
  onChange,
  readOnly = false,
}: VisualBlockEditorProps) {
  const addBlock = useCallback(
    (type: ContentBlockType) => {
      onChange([...blocks, createBlock(type, blocks.length)]);
    },
    [blocks, onChange],
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<ContentBlockItem>) => {
      onChange(blocks.map((b) => (b.blockId === blockId ? { ...b, ...patch } : b)));
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      onChange(
        blocks
          .filter((b) => b.blockId !== blockId)
          .map((b, i) => ({ ...b, order: i })),
      );
    },
    [blocks, onChange],
  );

  const moveUp = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.blockId === blockId);
      if (idx <= 0) return;
      const updated = [...blocks];
      const temp = updated[idx - 1];
      updated[idx - 1] = { ...updated[idx], order: idx - 1 };
      updated[idx] = { ...temp, order: idx };
      onChange(updated);
    },
    [blocks, onChange],
  );

  const moveDown = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.blockId === blockId);
      if (idx < 0 || idx >= blocks.length - 1) return;
      const updated = [...blocks];
      const temp = updated[idx + 1];
      updated[idx + 1] = { ...updated[idx], order: idx + 1 };
      updated[idx] = { ...temp, order: idx };
      onChange(updated);
    },
    [blocks, onChange],
  );

  if (readOnly) {
    return (
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <VisualBlockEditorItem
            key={block.blockId}
            block={block}
            index={index}
            totalBlocks={blocks.length}
            onUpdate={() => undefined}
            onRemove={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No blocks yet. Add one below to get started.
          </p>
        </div>
      ) : (
        blocks.map((block, index) => (
          <VisualBlockEditorItem
            key={block.blockId}
            block={block}
            index={index}
            totalBlocks={blocks.length}
            onUpdate={updateBlock}
            onRemove={removeBlock}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
          />
        ))
      )}

      {/* Add block */}
      <div className="flex items-center gap-2 pt-1">
        <Plus className="size-4 shrink-0 text-muted-foreground" />
        <Select onValueChange={(val: unknown) => addBlock(val as ContentBlockType)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Add a block..." />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPE_ENTRIES.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>
                {bt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
