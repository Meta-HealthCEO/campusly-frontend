'use client';

import { ChevronDown, ChevronRight, Edit, Trash2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BankQuestion, Difficulty } from '@/types';

interface QuestionCardProps {
  question: BankQuestion;
  onEdit: (question: BankQuestion) => void;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

function difficultyVariant(d: Difficulty): 'default' | 'secondary' | 'destructive' {
  if (d === 'easy') return 'default';
  if (d === 'medium') return 'secondary';
  return 'destructive';
}

function difficultyClass(d: Difficulty): string {
  if (d === 'easy') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (d === 'medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  return '';
}

export function QuestionCard({ question, onEdit, onDelete, expanded, onToggle }: QuestionCardProps) {
  const isHard = question.difficulty === 'hard';

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Collapsed header — always visible */}
        <div className="flex items-start gap-3" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
          <span className="mt-1 shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${expanded ? '' : 'line-clamp-2'}`}>
              {question.questionText}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {question.type.replace(/_/g, ' ')}
              </Badge>
              {isHard ? (
                <Badge variant="destructive" className="text-xs capitalize">
                  {question.difficulty}
                </Badge>
              ) : (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${difficultyClass(question.difficulty)}`}>
                  {question.difficulty}
                </span>
              )}
              <Badge variant="secondary" className="text-xs">
                {question.totalMarks} {question.totalMarks === 1 ? 'mark' : 'marks'}
              </Badge>
              {question.source && (
                <Badge variant="outline" className="text-xs capitalize">
                  {question.source.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Full Question</p>
              <p className="text-sm">{question.questionText}</p>
            </div>

            {question.correctAnswer && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Model Answer</p>
                <p className="text-sm">{question.correctAnswer}</p>
              </div>
            )}

            {question.type === 'mcq' && question.options && question.options.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Options</p>
                <ul className="space-y-1">
                  {question.options.map((opt) => (
                    <li key={opt.label} className="flex items-center gap-2 text-sm">
                      <span className="font-medium w-5">{opt.label}.</span>
                      <span className={opt.isCorrect ? 'font-medium text-green-700 dark:text-green-400' : ''}>
                        {opt.text}
                      </span>
                      {opt.isCorrect && <Check className="h-3 w-3 text-green-600 dark:text-green-400" />}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {question.tags && question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {question.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onEdit(question); }}
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
