'use client';

import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUESTION_TYPES, CAPS_LEVELS, TYPE_LABELS, CAPS_LABELS, CAPS_COLORS } from './question-constants';
import type { QuestionItem, QuestionFilters, QuestionType, CapsLevel } from '@/types/question-bank';

// ─── Props ──────────────────────────────────────────────────────────────────

interface QuestionSearchPanelProps {
  questions: QuestionItem[];
  loading: boolean;
  onSearch: (filters: QuestionFilters) => void;
  onAdd: (question: QuestionItem) => void;
  excludeQuestionIds: Set<string>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncateStem(stem: string, max = 90): string {
  if (stem.length <= max) return stem;
  return stem.slice(0, max) + '...';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuestionSearchPanel({
  questions,
  loading,
  onSearch,
  onAdd,
  excludeQuestionIds,
}: QuestionSearchPanelProps) {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [capsFilter, setCapsFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const excludedCount = useMemo(
    () => questions.filter((q: QuestionItem) => excludeQuestionIds.has(q.id)).length,
    [questions, excludeQuestionIds],
  );

  const availableQuestions = useMemo(
    () => questions.filter((q: QuestionItem) => !excludeQuestionIds.has(q.id)),
    [questions, excludeQuestionIds],
  );

  const handleSearch = () => {
    const filters: QuestionFilters = {};
    if (searchText.trim()) filters.search = searchText.trim();
    if (typeFilter !== 'all') filters.type = typeFilter as QuestionType;
    if (capsFilter !== 'all') filters.capsLevel = capsFilter as CapsLevel;
    if (difficultyFilter !== 'all') filters.difficulty = Number(difficultyFilter);
    onSearch(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search questions..."
            className="pl-9 w-full"
          />
        </div>
        <Button onClick={handleSearch} size="default">
          Search
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {QUESTION_TYPES.map((qt) => (
              <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={capsFilter} onValueChange={(v: unknown) => setCapsFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="CAPS Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {CAPS_LEVELS.map((cl) => (
              <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={(v: unknown) => setDifficultyFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {[1, 2, 3, 4, 5].map((d: number) => (
              <SelectItem key={d} value={String(d)}>Diff {d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Excluded count */}
      {excludedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {excludedCount} question{excludedCount !== 1 ? 's' : ''} already in paper
        </p>
      )}

      {/* Results */}
      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : availableQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No matching questions found.
          </p>
        ) : (
          availableQuestions.map((q: QuestionItem) => (
            <SearchResultRow key={q.id} question={q} onAdd={() => onAdd(q)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Search Result Row ──────────────────────────────────────────────────────

interface SearchResultRowProps {
  question: QuestionItem;
  onAdd: () => void;
}

function SearchResultRow({ question, onAdd }: SearchResultRowProps) {
  const capsLevel = question.cognitiveLevel.caps;

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
      <span className="flex-1 truncate">{truncateStem(question.stem)}</span>
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <Badge variant="secondary" className="text-xs">
          {TYPE_LABELS[question.type]}
        </Badge>
        <Badge className={`text-xs ${CAPS_COLORS[capsLevel]}`}>
          {CAPS_LABELS[capsLevel]}
        </Badge>
      </div>
      <Badge variant="outline" className="shrink-0">[{question.marks}]</Badge>
      <Button variant="ghost" size="icon-sm" onClick={onAdd} title="Add to paper">
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
