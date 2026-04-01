'use client';

import { Plus, Trash2, ChevronUp, ChevronDown, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import type { BankQuestion } from '@/types';

export interface PaperBuilderSection {
  id: string;
  title: string;
  questions: BankQuestion[];
}

interface PaperBuilderPanelProps {
  sections: PaperBuilderSection[];
  onRemoveQuestion: (sectionId: string, questionIndex: number) => void;
  onMoveQuestion: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onAddSection: () => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSectionTitle: (sectionId: string, title: string) => void;
}

function totalMarks(sections: PaperBuilderSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.questions.reduce((acc, q) => acc + q.marks, 0),
    0,
  );
}

function totalQuestions(sections: PaperBuilderSection[]): number {
  return sections.reduce((sum, s) => sum + s.questions.length, 0);
}

function estimatedMinutes(marks: number): number {
  // Rough: 1 mark ≈ 1 minute
  return marks;
}

export function PaperBuilderPanel({
  sections,
  onRemoveQuestion,
  onMoveQuestion,
  onAddSection,
  onRemoveSection,
  onUpdateSectionTitle,
}: PaperBuilderPanelProps) {
  const marks = totalMarks(sections);
  const questions = totalQuestions(sections);
  const duration = estimatedMinutes(marks);

  const isEmpty = sections.length === 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Paper Structure
        </p>
        <Button size="sm" variant="outline" onClick={onAddSection}>
          <Plus className="h-3 w-3 mr-1" />
          Add Section
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={FileText}
          title="Paper is empty"
          description="Add questions from the bank or use AI Fill Gaps"
        />
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardContent className="p-3 space-y-3">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <Input
                    value={section.title}
                    onChange={(e) => onUpdateSectionTitle(section.id, e.target.value)}
                    className="h-7 text-sm font-medium flex-1"
                    placeholder="Section title"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveSection(section.id)}
                    title="Remove section"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Questions */}
                {section.questions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">
                    No questions yet — add from the bank
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {section.questions.map((q, idx) => (
                      <div
                        key={`${q.id}-${idx}`}
                        className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                      >
                        <span className="shrink-0 text-xs text-muted-foreground w-5 text-right">
                          {idx + 1}.
                        </span>
                        <p className="flex-1 text-xs truncate">{q.questionText}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {q.marks}m
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize shrink-0 hidden sm:inline-flex">
                          {q.questionType.replace(/_/g, ' ')}
                        </Badge>
                        <div className="flex shrink-0 flex-col">
                          <button
                            className="h-4 w-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => onMoveQuestion(section.id, idx, idx - 1)}
                            disabled={idx === 0}
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            className="h-4 w-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() =>
                              onMoveQuestion(section.id, idx, idx + 1)
                            }
                            disabled={idx === section.questions.length - 1}
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          className="shrink-0 h-4 w-4 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveQuestion(section.id, idx)}
                          title="Remove question"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Running totals bar */}
      {!isEmpty && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{questions}</span> question
            {questions !== 1 ? 's' : ''}
          </span>
          <span>
            <span className="font-semibold text-foreground">{marks}</span> marks
          </span>
          <span>
            ~<span className="font-semibold text-foreground">{duration}</span> min
          </span>
        </div>
      )}
    </div>
  );
}
