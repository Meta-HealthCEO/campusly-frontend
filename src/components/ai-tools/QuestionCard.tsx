'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DiagramRenderer from '@/components/shared/DiagramRenderer';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Pencil, Check, RefreshCw, Loader2 } from 'lucide-react';
import type { PaperQuestion } from './types';

interface QuestionCardProps {
  question: PaperQuestion;
  sectionIndex: number;
  questionIndex: number;
  regeneratingKey: string | null;
  onEdit: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerate: (sectionIndex: number, questionIndex: number) => void;
  showModelAnswer?: boolean;
}

export function QuestionCard({
  question,
  sectionIndex,
  questionIndex,
  regeneratingKey,
  onEdit,
  onRegenerate,
  showModelAnswer = false,
}: QuestionCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question.questionText);
  const isRegenerating = regeneratingKey === `${sectionIndex}:${questionIndex}`;

  const handleSaveEdit = () => {
    onEdit(sectionIndex, questionIndex, editText);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(question.questionText);
    setEditing(false);
  };

  return (
    <Card className={isRegenerating ? 'opacity-60' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground">
                Q{question.questionNumber}
              </span>
              <Badge variant="secondary" className="text-xs">
                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
              </Badge>
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  className="w-full rounded-md border p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="default" onClick={handleSaveEdit}>
                    <Check className="mr-1 h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm [&_.katex-display]:my-2">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {question.questionText}
                </ReactMarkdown>
              </div>
            )}
            {question.diagram && (
              <DiagramRenderer diagram={question.diagram} size="sm" className="mt-2" />
            )}
            {showModelAnswer && question.modelAnswer && (
              <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Model Answer:</p>
                <p className="text-emerald-800">{question.modelAnswer}</p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditText(question.questionText); setEditing(true); }}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(sectionIndex, questionIndex)}
              title="Regenerate"
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
