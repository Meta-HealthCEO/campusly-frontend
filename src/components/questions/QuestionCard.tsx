'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DiagramRenderer from '@/components/shared/DiagramRenderer';
import {
  QUESTION_TYPE_LABELS,
  QUESTION_STATUS_VARIANT,
  QUESTION_STATUS_LABELS,
  CAPS_LEVEL_LABELS,
  CAPS_LEVEL_COLORS,
} from '@/lib/design-system';
import type { QuestionItem } from '@/types/question-bank';

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncateStem(stem: string, max = 100): string {
  if (stem.length <= max) return stem;
  return stem.slice(0, max) + '...';
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty: ${level}/5`}>
      {Array.from({ length: 5 }, (_, i: number) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${
            i < level ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        />
      ))}
    </span>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuestionItem;
  onClick: (question: QuestionItem) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuestionCard({ question, onClick }: QuestionCardProps) {
  const capsLevel = question.cognitiveLevel.caps;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(question)}
    >
      <CardContent className="flex flex-col gap-3">
        {/* Stem preview */}
        <p className="text-sm line-clamp-2">{truncateStem(question.stem)}</p>

        {question.diagram && (
          <DiagramRenderer diagram={question.diagram} size="sm" className="mt-2" />
        )}

        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          <Badge variant="outline">[{question.marks}]</Badge>
          <Badge className={CAPS_LEVEL_COLORS[capsLevel]}>
            {CAPS_LEVEL_LABELS[capsLevel]}
          </Badge>
          <Badge variant={QUESTION_STATUS_VARIANT[question.status]}>
            {QUESTION_STATUS_LABELS[question.status]}
          </Badge>
          {question.source === 'ai_generated' && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3" />
              AI
            </Badge>
          )}
        </div>

        {/* Footer: difficulty + tags */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <DifficultyDots level={question.difficulty} />
          {question.tags.length > 0 && (
            <span className="truncate ml-2">
              {question.tags.slice(0, 3).join(', ')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
