'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EditableBlock } from '@/lib/item-editing';

interface Props {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
}

/** The notes' text, one box per block. Markdown works: **bold**, - lists, ## headings. */
export function NotesEditor({ blocks, onChange }: Props) {
  const set = (i: number, content: string): void => onChange(blocks.map((b, j) => (j === i ? { ...b, content } : b)));
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={b.blockId || i} className="space-y-1.5">
          <Label htmlFor={`notes-${i}`}>{blocks.length > 1 ? `Part ${i + 1}` : 'Notes'}</Label>
          <Textarea id={`notes-${i}`} value={b.content} onChange={(e) => set(i, e.target.value)} className="min-h-64 font-mono text-sm" />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Use **bold**, - for lists and ## for a heading.</p>
    </div>
  );
}
