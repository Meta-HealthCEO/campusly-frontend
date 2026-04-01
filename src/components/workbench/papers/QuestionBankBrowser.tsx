'use client';

import { Plus, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import type { BankQuestion, QuestionFilters, Difficulty, CognitiveLevel } from '@/types';

interface QuestionBankBrowserProps {
  questions: BankQuestion[];
  loading: boolean;
  onAddQuestion: (question: BankQuestion) => void;
  filters: QuestionFilters;
  onFiltersChange: (filters: QuestionFilters) => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const COGNITIVE_LEVELS: CognitiveLevel[] = [
  'knowledge',
  'comprehension',
  'application',
  'analysis',
  'synthesis',
  'evaluation',
];

function difficultyVariant(d: Difficulty): 'default' | 'secondary' | 'destructive' {
  if (d === 'easy') return 'default';
  if (d === 'medium') return 'secondary';
  return 'destructive';
}

export function QuestionBankBrowser({
  questions,
  loading,
  onAddQuestion,
  filters,
  onFiltersChange,
}: QuestionBankBrowserProps) {
  function handleDifficulty(val: string) {
    const next = val === 'all' ? undefined : (val as Difficulty);
    onFiltersChange({ ...filters, difficulty: next });
  }

  function handleCognitive(val: string) {
    const next = val === 'all' ? undefined : (val as CognitiveLevel);
    onFiltersChange({ ...filters, cognitiveLevel: next });
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Question Bank
      </p>

      {/* Filters row */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.difficulty ?? 'all'}
          onValueChange={handleDifficulty}
        >
          <SelectTrigger className="w-full text-xs h-8">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d} className="capitalize">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.cognitiveLevel ?? 'all'}
          onValueChange={handleCognitive}
        >
          <SelectTrigger className="w-full text-xs h-8">
            <SelectValue placeholder="Cognitive" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {COGNITIVE_LEVELS.map((l) => (
              <SelectItem key={l} value={l} className="capitalize">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{questions.length} question(s)</p>

      {/* Question list */}
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No questions match"
          description="Adjust your filters or add questions to the bank."
        />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {questions.map((q) => (
            <Card key={q.id} className="group">
              <CardContent className="p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug line-clamp-2">{q.questionText}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {q.questionType.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={difficultyVariant(q.difficulty)} className="text-xs capitalize">
                      {q.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {q.marks}m
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 w-7 p-0"
                  onClick={() => onAddQuestion(q)}
                  title="Add to paper"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
