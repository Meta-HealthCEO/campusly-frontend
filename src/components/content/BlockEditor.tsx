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
import { BlockEditorItem } from './BlockEditorItem';
import type { ContentBlockItem, ContentBlockType } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOCK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'drag_drop', label: 'Drag & Drop' },
  { value: 'fill_blank', label: 'Fill Blank' },
  { value: 'match_columns', label: 'Match Columns' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'hotspot', label: 'Hotspot' },
  { value: 'step_reveal', label: 'Step Reveal' },
  { value: 'code', label: 'Code' },
];

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

// ─── Props ──────────────────────────────────────────────────────────────────

interface BlockEditorProps {
  blocks: ContentBlockItem[];
  onChange: (blocks: ContentBlockItem[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const addBlock = useCallback(
    (type: ContentBlockType) => {
      const newBlock = createBlock(type, blocks.length);
      onChange([...blocks, newBlock]);
    },
    [blocks, onChange],
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<ContentBlockItem>) => {
      onChange(
        blocks.map((b) => (b.blockId === blockId ? { ...b, ...patch } : b)),
      );
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

  return (
    <div className="space-y-3">
      {/* Block list */}
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No blocks yet. Add one below to get started.
          </p>
        </div>
      ) : (
        blocks.map((block, index) => (
          <BlockEditorItem
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

      {/* Add block dropdown */}
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-muted-foreground" />
        <Select
          onValueChange={(val: unknown) => addBlock(val as ContentBlockType)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Add a block..." />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((bt) => (
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
