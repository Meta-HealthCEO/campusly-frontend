'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { CurriculumNodeItem, Grade } from '@/types';
import type { AcademicLookupItem } from '@/hooks/useAcademicLookups';

interface Props {
  /** Teacher class+subject entries — used only to derive distinct grade+subject
   *  combos the teacher actually teaches. The class itself is no longer part
   *  of the new-lesson flow (assignment happens in the workspace later). */
  entries: TeacherClassEntry[];
  /** All grades — used to render a friendly grade name. */
  grades: Grade[];
  /** Curriculum framework (default) — drives the topic catalog query. */
  frameworkId: string;

  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  termNumber: number;

  onSubjectChange: (subjectId: string) => void;
  onGradeChange: (gradeId: string) => void;
  onTermChange: (n: number) => void;
  onTopicSelect: (node: CurriculumNodeItem) => void;
}

const TERM_NUMBERS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];

interface SubjectGradeCombo {
  key: string;
  subjectId: string;
  subjectName: string;
  gradeId: string;
  gradeName: string;
}

export function TopicQuickPicker({
  entries,
  grades,
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

  const { topics, subtopics, loading: topicsLoading } = useTopicCatalog({
    frameworkId,
    subjectId,
    gradeId,
    termNumber,
  });
  const { items: recent, loading: recentLoading } = useRecentTopics(6);

  // Derive the unique (subject, grade) combos this teacher actually teaches.
  // A teacher with Maths-11A and Maths-11B sees a single (Maths, Grade 11)
  // combo; with Maths-10A AND Physics-11A they see two distinct combos.
  const combos = useMemo<SubjectGradeCombo[]>(() => {
    const seen = new Map<string, SubjectGradeCombo>();
    for (const e of entries) {
      if (!e.subject || !e.class?.gradeId) continue;
      const subjectIdEntry = e.subject.id;
      const gradeIdEntry = e.class.gradeId;
      const key = `${subjectIdEntry}:${gradeIdEntry}`;
      if (seen.has(key)) continue;
      const grade = grades.find((g) => g.id === gradeIdEntry);
      seen.set(key, {
        key,
        subjectId: subjectIdEntry,
        subjectName: e.subject.name,
        gradeId: gradeIdEntry,
        gradeName: grade?.name ?? 'Grade',
      });
    }
    return Array.from(seen.values());
  }, [entries, grades]);

  // Subject options are unique subjects across the teacher's combos.
  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const c of combos) {
      if (!map.has(c.subjectId)) {
        map.set(c.subjectId, { id: c.subjectId, name: c.subjectName });
      }
    }
    return Array.from(map.values());
  }, [combos]);

  // Grade options narrow to grades available for the picked subject (so a
  // teacher who teaches Maths to Grade 10 and Physics to Grade 11 doesn't see
  // Grade 11 listed under Maths).
  const gradeOptions = useMemo(() => {
    const filtered = subjectId
      ? combos.filter((c) => c.subjectId === subjectId)
      : combos;
    const map = new Map<string, { id: string; name: string }>();
    for (const c of filtered) {
      if (!map.has(c.gradeId)) {
        map.set(c.gradeId, { id: c.gradeId, name: c.gradeName });
      }
    }
    return Array.from(map.values());
  }, [combos, subjectId]);

  // Auto-select when the teacher has only one combo total. Doing this in a
  // useEffect (rather than as a default initial value) means the parent stays
  // the source of truth for the form state and we react to entries loading
  // asynchronously.
  useEffect(() => {
    if (combos.length !== 1) return;
    const only = combos[0];
    if (!subjectId) onSubjectChange(only.subjectId);
    if (!gradeId) onGradeChange(only.gradeId);
  }, [combos, subjectId, gradeId, onSubjectChange, onGradeChange]);

  // If the picked grade no longer fits the picked subject, drop it.
  useEffect(() => {
    if (!gradeId) return;
    if (!gradeOptions.some((g) => g.id === gradeId)) {
      onGradeChange('');
    }
  }, [gradeOptions, gradeId, onGradeChange]);

  const recentForContext = useMemo(() => {
    return recent.filter((r: RecentTopic) => {
      if (subjectId && r.subjectId && r.subjectId !== subjectId) return false;
      if (gradeId && r.gradeId && r.gradeId !== gradeId) return false;
      return true;
    });
  }, [recent, subjectId, gradeId]);

  const subjectName = subjectOptions.find((s) => s.id === subjectId)?.name;
  const gradeName = gradeOptions.find((g) => g.id === gradeId)?.name;
  const contextReady = !!subjectId && !!gradeId;
  const singleCombo = combos.length === 1;

  return (
    <div className="space-y-4">
      {/* When the teacher has only one (subject, grade) combo, skip the selects
          entirely — auto-selection above keeps parent state in sync, so we can
          jump straight to the topic picker. */}
      {!singleCombo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Select
              value={subjectId}
              onValueChange={(v: unknown) => onSubjectChange(v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No subjects in your teaching load.
                  </div>
                )}
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Grade <span className="text-destructive">*</span></Label>
            <Select
              value={gradeId}
              onValueChange={(v: unknown) => onGradeChange(v as string)}
              disabled={!subjectId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={subjectId ? 'Pick a grade' : 'Pick a subject first'} />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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

/**
 * A recent-topic chip click feeds the same handler the topic list uses, but
 * the recent endpoint only carries id/title/refs. Synthesize a minimal node
 * so the shared handler stays typed.
 */
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
