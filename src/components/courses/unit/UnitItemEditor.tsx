'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NotesEditor } from '@/components/courses/unit/NotesEditor';
import { StepsEditor } from '@/components/courses/unit/StepsEditor';
import { QuestionsEditor } from '@/components/courses/unit/QuestionsEditor';
import { questionsProblem, stepsFromBlocks, textBlocksOf, type EditableBlock, type EditableQuestion, type EditableStep } from '@/lib/item-editing';
import type { ItemPreview } from '@/hooks/useClassUnit';
import type { ItemKind } from '@/types/courses';

export type ItemEdit =
  | { kind: 'blocks'; blocks: EditableBlock[] }
  | { kind: 'steps'; steps: EditableStep[] }
  | { kind: 'questions'; questions: EditableQuestion[] };

interface Props {
  itemKind: ItemKind;
  preview: ItemPreview;
  saving: boolean;
  /** The server's reason a save failed, shown above the buttons. */
  error: string | null;
  onSave: (edit: ItemEdit) => void;
  onCancel: () => void;
}

function initialEdit(itemKind: ItemKind, preview: ItemPreview): ItemEdit {
  if (preview.kind === 'quiz') {
    return { kind: 'questions', questions: preview.questions.map((q) => ({ stem: q.stem, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) })) };
  }
  const blocks = preview.kind === 'content' ? preview.blocks.map((b) => ({ blockId: b.blockId, type: b.type, content: b.content })) : [];
  return itemKind === 'worked_example'
    ? { kind: 'steps', steps: stepsFromBlocks(blocks) }
    : { kind: 'blocks', blocks: textBlocksOf(blocks) };
}

/** Edit an item in place: notes text, worked-example steps, or quick-check questions. */
export function UnitItemEditor({ itemKind, preview, saving, error, onSave, onCancel }: Props) {
  const [edit, setEdit] = useState<ItemEdit>(() => initialEdit(itemKind, preview));
  const problem = edit.kind === 'questions' ? questionsProblem(edit.questions) : null;
  const [showProblem, setShowProblem] = useState(false);

  const save = (): void => {
    if (problem) {
      setShowProblem(true);
      return;
    }
    onSave(edit);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {edit.kind === 'blocks' ? <NotesEditor blocks={edit.blocks} onChange={(blocks) => setEdit({ kind: 'blocks', blocks })} /> : null}
        {edit.kind === 'steps' ? <StepsEditor steps={edit.steps.length > 0 ? edit.steps : [{ title: '', content: '' }]} onChange={(steps) => setEdit({ kind: 'steps', steps })} /> : null}
        {edit.kind === 'questions' ? <QuestionsEditor questions={edit.questions} onChange={(questions) => { setEdit({ kind: 'questions', questions }); setShowProblem(false); }} /> : null}
      </div>
      <div className="space-y-2 border-t border-border px-4 py-3">
        {(showProblem && problem) || error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{showProblem && problem ? problem : error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={save} disabled={saving} className="min-h-11 sm:min-h-9">{saving ? 'Saving…' : 'Save'}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Your changes are kept: the AI won&apos;t write over this item again.</p>
      </div>
    </div>
  );
}
