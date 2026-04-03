'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TYPE_LABELS, CAPS_LABELS, CAPS_COLORS } from './question-constants';
import type { PaperSectionItem, QuestionItem } from '@/types/question-bank';

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaperSectionProps {
  section: PaperSectionItem;
  sectionIndex: number;
  populatedQuestions: Map<string, QuestionItem>;
  onRemoveQuestion: (sectionIndex: number, questionOrder: number) => void;
  onAddQuestion: (sectionIndex: number) => void;
  onUpdateSection: (sectionIndex: number, updates: { title?: string; instructions?: string }) => void;
  onRemoveSection: (sectionIndex: number) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncateStem(stem: string, max = 80): string {
  if (stem.length <= max) return stem;
  return stem.slice(0, max) + '...';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PaperSection({
  section,
  sectionIndex,
  populatedQuestions,
  onRemoveQuestion,
  onAddQuestion,
  onUpdateSection,
  onRemoveSection,
}: PaperSectionProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const sectionMarks = section.questions.reduce(
    (sum: number, q) => sum + q.marks,
    0,
  );

  return (
    <Card>
      <CardContent className="space-y-3">
        {/* Section header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={section.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdateSection(sectionIndex, { title: e.target.value })
            }
            className="font-medium text-base w-full sm:w-auto sm:flex-1"
            placeholder="Section title"
          />
          <div className="flex items-center gap-2">
            <Badge variant="outline">{sectionMarks} marks</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowInstructions((p) => !p)}
              title="Toggle instructions"
            >
              {showInstructions ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemoveSection(sectionIndex)}
              title="Remove section"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Collapsible instructions */}
        {showInstructions && (
          <Textarea
            value={section.instructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onUpdateSection(sectionIndex, { instructions: e.target.value })
            }
            placeholder="Section instructions (optional)"
            rows={2}
          />
        )}

        {/* Questions list */}
        {section.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No questions in this section yet.
          </p>
        ) : (
          <div className="space-y-1">
            {section.questions.map((pq, idx: number) => {
              const question = populatedQuestions.get(pq.questionId);
              return (
                <QuestionRow
                  key={pq.questionId}
                  questionNumber={pq.questionNumber}
                  question={question}
                  marks={pq.marks}
                  isFirst={idx === 0}
                  isLast={idx === section.questions.length - 1}
                  onRemove={() => onRemoveQuestion(sectionIndex, pq.order)}
                />
              );
            })}
          </div>
        )}

        {/* Add question button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAddQuestion(sectionIndex)}
        >
          <Plus className="size-4 mr-1" />
          Add Question
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Question Row ───────────────────────────────────────────────────────────

interface QuestionRowProps {
  questionNumber: string;
  question: QuestionItem | undefined;
  marks: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
}

function QuestionRow({
  questionNumber,
  question,
  marks,
  onRemove,
}: QuestionRowProps) {
  if (!question) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
        <span className="font-mono">{questionNumber}</span>
        <span className="flex-1 italic">Question not found</span>
        <Badge variant="outline">[{marks}]</Badge>
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    );
  }

  const capsLevel = question.cognitiveLevel.caps;

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="font-mono text-muted-foreground shrink-0">
        {questionNumber}
      </span>
      <span className="flex-1 truncate">{truncateStem(question.stem)}</span>
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <Badge variant="secondary" className="text-xs">
          {TYPE_LABELS[question.type]}
        </Badge>
        <Badge className={`text-xs ${CAPS_COLORS[capsLevel]}`}>
          {CAPS_LABELS[capsLevel]}
        </Badge>
      </div>
      <Badge variant="outline" className="shrink-0">[{marks}]</Badge>
      <Button variant="ghost" size="icon-sm" onClick={onRemove}>
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  );
}
