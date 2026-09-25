'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NotesEditor } from '@/components/courses/unit/NotesEditor';
import { StepsEditor } from '@/components/courses/unit/StepsEditor';
import { QuestionsEditor } from '@/components/courses/unit/QuestionsEditor';
import { keptBlocksNote, questionsProblem, stepsFromBlocks, textBlocksOf, type EditableBlock, type EditableQuestion, type EditableStep } from '@/lib/item-editing';
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
    return { kind: 'questions', questions: preview.questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) })) };
  }
  const blocks = preview.kind === 'content' ? preview.blocks.map((b) => ({ blockId: b.blockId, type: b.type, content: b.content })) : [];
  return itemKind === 'worked_example'
    ? { kind: 'steps', steps: stepsFromBlocks(blocks) }
    : { kind: 'blocks', blocks: textBlocksOf(blocks) };
}

/** Edit an item in place: notes text, worked-example steps, or quick-check questions. */
export function UnitItemEditor({ itemKind, preview, saving, error, onSave, onCancel }: Props) {
  const [edit, setEdit] = useState<ItemEdit>(() => initialEdit(itemKind, preview));
  const kept = preview.kind === 'content' && itemKind !== 'quick_check'
    ? keptBlocksNote(itemKind, preview.blocks.map((b) => ({ blockId: b.blockId, type: b.type, content: b.content })))
    : null;
  const problem = edit.kind === 'questions' ? questionsProblem(edit.questions) : null;
  const [showProblem, setShowProblem] = useState(false);
  // `error` is the last save/rewrite failure for this item; it can predate
  // this editor session (e.g. a rewrite that failed before Edit was
  // clicked). Only show it once this session has actually tried to save.
  const [attempted, setAttempted] = useState(false);

  const change = (next: ItemEdit): void => {
    setEdit(next);
    setShowProblem(false);
    setAttempted(false);
  };

  const save = (): void => {
    if (problem) {
      setShowProblem(true);
      return;
    }
    setAttempted(true);
    onSave(edit);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {kept ? <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info">{kept}</p> : null}
        {edit.kind === 'blocks' ? <NotesEditor blocks={edit.blocks} onChange={(blocks) => change({ kind: 'blocks', blocks })} /> : null}
        {edit.kind === 'steps' ? <StepsEditor steps={edit.steps.length > 0 ? edit.steps : [{ title: '', content: '' }]} onChange={(steps) => change({ kind: 'steps', steps })} /> : null}
        {edit.kind === 'questions' ? <QuestionsEditor questions={edit.questions} onChange={(questions) => change({ kind: 'questions', questions })} /> : null}
      </div>
      <div className="space-y-2 border-t border-border px-4 py-3">
        {(showProblem && problem) || (attempted && error) ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{showProblem && problem ? problem : error}</p>
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
