'use client';

import { useState, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContentBlockItem, ContentBlockType } from '@/types';

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

interface QuizData {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options?: { label: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
}

function parseQuiz(content: string): QuizData {
  try {
    return JSON.parse(content) as QuizData;
  } catch {
    return { question: content, type: 'short_answer' };
  }
}

function QuizEditForm({
  block,
  onUpdate,
}: {
  block: ContentBlockItem;
  onUpdate: (patch: Partial<ContentBlockItem>) => void;
}) {
  const quiz = parseQuiz(block.content);

  const saveQuiz = useCallback(
    (patch: Partial<QuizData>) => {
      onUpdate({ content: JSON.stringify({ ...quiz, ...patch }) });
    },
    [quiz, onUpdate],
  );

  const updateOption = useCallback(
    (idx: number, field: 'text' | 'isCorrect', value: string | boolean) => {
      const opts = (quiz.options ?? []).map((o, i) =>
        i === idx ? { ...o, [field]: value } : o,
      );
      saveQuiz({ options: opts });
    },
    [quiz, saveQuiz],
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>Question</Label>
        <Textarea
          rows={2}
          value={quiz.question}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            saveQuiz({ question: e.target.value })
          }
        />
      </div>
      {quiz.options && quiz.options.length > 0 && (
        <div className="space-y-2">
          <Label>Options</Label>
          {quiz.options.map((opt, idx) => (
            <div key={opt.label} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                {opt.label}
              </span>
              <Input
                value={opt.text}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateOption(idx, 'text', e.target.value)
                }
                className="flex-1"
              />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={opt.isCorrect}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateOption(idx, 'isCorrect', e.target.checked)
                  }
                />
                Correct
              </label>
            </div>
          ))}
        </div>
      )}
      <div>
        <Label>Explanation</Label>
        <Input
          value={quiz.explanation ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            saveQuiz({ explanation: e.target.value })
          }
          placeholder="Explain the correct answer..."
        />
      </div>
    </div>
  );
}

interface FillBlankData {
  text: string;
  blanks: string[];
}

function parseFillBlank(content: string): FillBlankData {
  try {
    return JSON.parse(content) as FillBlankData;
  } catch {
    return { text: content, blanks: [] };
  }
}

function FillBlankEditForm({
  block,
  onUpdate,
}: {
  block: ContentBlockItem;
  onUpdate: (patch: Partial<ContentBlockItem>) => void;
}) {
  const data = parseFillBlank(block.content);

  const save = useCallback(
    (patch: Partial<FillBlankData>) => {
      onUpdate({ content: JSON.stringify({ ...data, ...patch }) });
    },
    [data, onUpdate],
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>Text (use ___ for blanks)</Label>
        <Textarea
          rows={3}
          value={data.text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            save({ text: e.target.value })
          }
        />
      </div>
      <div>
        <Label>Answers (comma-separated)</Label>
        <Input
          value={data.blanks.join(', ')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            save({
              blanks: e.target.value
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="answer1, answer2..."
        />
      </div>
    </div>
  );
}

function GenericEditForm({
  block,
  onUpdate,
}: {
  block: ContentBlockItem;
  onUpdate: (patch: Partial<ContentBlockItem>) => void;
}) {
  const isMedia = block.type === 'image' || block.type === 'video';
  return (
    <div className="space-y-3">
      <div>
        <Label>{isMedia ? 'URL / Embed Source' : 'Content (Markdown)'}</Label>
        <Textarea
          rows={isMedia ? 2 : 5}
          value={block.content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onUpdate({ content: e.target.value })
          }
          placeholder={isMedia ? 'https://...' : 'Enter markdown content...'}
        />
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: ContentBlockItem }) {
  if (block.type === 'text') {
    return (
      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
        {block.content || <em>No content</em>}
      </p>
    );
  }
  if (block.type === 'quiz') {
    const q = parseQuiz(block.content);
    return <p className="text-sm text-muted-foreground line-clamp-2">{q.question || 'No question'}</p>;
  }
  if (block.type === 'fill_blank') {
    const d = parseFillBlank(block.content);
    return <p className="text-sm text-muted-foreground line-clamp-2">{d.text || 'No content'}</p>;
  }
  if (block.type === 'image' || block.type === 'video') {
    return (
      <p className="text-xs text-muted-foreground truncate font-mono">
        {block.content || 'No URL set'}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
      {block.content || 'No content'}
    </p>
  );
}

interface VisualBlockEditorItemProps {
  block: ContentBlockItem;
  index: number;
  totalBlocks: number;
  onUpdate: (blockId: string, patch: Partial<ContentBlockItem>) => void;
  onRemove: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
}

export function VisualBlockEditorItem({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: VisualBlockEditorItemProps) {
  const [editing, setEditing] = useState(false);

  const handleUpdate = useCallback(
    (patch: Partial<ContentBlockItem>) => onUpdate(block.blockId, patch),
    [block.blockId, onUpdate],
  );

  const renderEditForm = () => {
    if (block.type === 'quiz') {
      return <QuizEditForm block={block} onUpdate={handleUpdate} />;
    }
    if (block.type === 'fill_blank') {
      return <FillBlankEditForm block={block} onUpdate={handleUpdate} />;
    }
    return <GenericEditForm block={block} onUpdate={handleUpdate} />;
  };

  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        {/* Toolbar */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary" className="shrink-0">
            {BLOCK_TYPE_LABELS[block.type]}
          </Badge>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === 0}
              onClick={() => onMoveUp(block.blockId)}
              aria-label="Move block up"
              className="size-10 sm:size-7"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === totalBlocks - 1}
              onClick={() => onMoveDown(block.blockId)}
              aria-label="Move block down"
              className="size-10 sm:size-7"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing((e) => !e)}
              aria-label={editing ? 'Switch to preview' : 'Edit block'}
              className="size-10 sm:size-7"
            >
              {editing ? (
                <Eye className="size-4" />
              ) : (
                <Pencil className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(block.blockId)}
              aria-label="Delete block"
              className="size-10 sm:size-7"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="mt-2">
          {editing ? renderEditForm() : <BlockPreview block={block} />}
        </div>
      </CardContent>
    </Card>
  );
}
