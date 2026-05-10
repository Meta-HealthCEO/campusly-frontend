'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TopicListPanel } from './TopicListPanel';
import { useRecentTopics, type RecentTopic } from '@/hooks/useRecentTopics';
import { useTopicCatalog } from '@/hooks/useTopicCatalog';
import { useCurriculumGrades } from '@/hooks/useCurriculumGrades';
import { useCurriculumSubjects } from '@/hooks/useCurriculumSubjects';
import type { CurriculumNodeItem } from '@/types';

interface Props {
  /** Curriculum framework (default) — drives every dropdown below. */
  frameworkId: string;

  /** Subject CurriculumNode `_id` (NOT an academic Subject id). */
  subjectId: string;
  /** Grade CurriculumNode `_id` (NOT an academic Grade id). */
  gradeId: string;
  curriculumNodeId: string;
  termNumber: number;

  onSubjectChange: (subjectId: string) => void;
  onGradeChange: (gradeId: string) => void;
  onTermChange: (n: number) => void;
  onTopicSelect: (node: CurriculumNodeItem) => void;
}

const TERM_NUMBERS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];

export function TopicQuickPicker({
  frameworkId,
  subjectId,
  gradeId,
  curriculumNodeId,
  termNumber,
  onSubjectChange,
  onGradeChange,
  onTermChange,
  onTopicSelect,
}: Props) {
  const [search, setSearch] = useState('');

  // CAPS sources — every grade and every subject under that grade. No school
  // collections involved (works for the standalone teacher portal).
  const { grades, loading: gradesLoading } = useCurriculumGrades(frameworkId);
  const { subjects, loading: subjectsLoading } = useCurriculumSubjects(
    frameworkId,
    gradeId,
  );

  const { topics, subtopics, loading: topicsLoading } = useTopicCatalog({
    frameworkId,
    subjectId,
    gradeId,
    termNumber,
  });
  const { items: recent, loading: recentLoading } = useRecentTopics(6);

  const recentForContext = useMemo(() => {
    return recent.filter((r: RecentTopic) => {
      if (subjectId && r.subjectId && r.subjectId !== subjectId) return false;
      if (gradeId && r.gradeId && r.gradeId !== gradeId) return false;
      return true;
    });
  }, [recent, subjectId, gradeId]);

  const subjectName = subjects.find((s) => s.id === subjectId)?.title;
  const gradeName = grades.find((g) => g.id === gradeId)?.title;
  const contextReady = !!subjectId && !!gradeId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Grade <span className="text-destructive">*</span></Label>
          <Select
            value={gradeId}
            onValueChange={(v: unknown) => onGradeChange(v as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={gradesLoading ? 'Loading grades...' : 'Pick a grade'}
              />
            </SelectTrigger>
            <SelectContent>
              {!gradesLoading && grades.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No grades found in the CAPS framework.
                </div>
              )}
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Subject <span className="text-destructive">*</span></Label>
          <Select
            value={subjectId}
            onValueChange={(v: unknown) => onSubjectChange(v as string)}
            disabled={!gradeId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !gradeId
                    ? 'Pick a grade first'
                    : subjectsLoading ? 'Loading subjects...' : 'Pick a subject'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {gradeId && !subjectsLoading && subjects.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No subjects under this grade.
                </div>
              )}
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Topic <span className="text-destructive">*</span></Label>
          {subjectName && gradeName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{gradeName}</span>
              {' · '}
              <span className="font-medium text-foreground">{subjectName}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Term</span>
          {TERM_NUMBERS.map((n) => {
            const active = termNumber === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onTermChange(n)}
                className={
                  active
                    ? 'h-9 min-w-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground'
                    : 'h-9 min-w-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent'
                }
              >
                {n}
              </button>
            );
          })}
        </div>

        {!recentLoading && recentForContext.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              Recently used
            </p>
            <div className="flex flex-wrap gap-2">
              {recentForContext.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onTopicSelect(recentToNode(r, frameworkId))}
                  className={
                    curriculumNodeId === r.id
                      ? 'rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary'
                      : 'rounded-full border border-input bg-background px-3 py-1 text-xs hover:bg-accent'
                  }
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="w-full pl-9"
          />
        </div>

        <TopicListPanel
          topics={topics}
          subtopics={subtopics}
          search={search}
          loading={topicsLoading}
          ready={contextReady}
          selectedId={curriculumNodeId}
          onSelect={onTopicSelect}
        />
      </div>
    </div>
  );
}

function recentToNode(r: RecentTopic, frameworkId: string): CurriculumNodeItem {
  return {
    id: r.id,
    frameworkId,
    type: 'topic',
    parentId: null,
    title: r.title,
    code: '',
    description: '',
    metadata: {
      weekNumbers: [],
      capsReference: '',
      assessmentStandards: [],
      notionalHours: 0,
      cognitiveWeighting: null,
    },
    order: 0,
    schoolId: null,
    subjectId: r.subjectId,
    gradeId: r.gradeId,
    termNumber: r.termNumber,
    createdAt: '',
    updatedAt: '',
  };
}
