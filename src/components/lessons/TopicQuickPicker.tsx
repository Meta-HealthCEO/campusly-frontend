'use client';

import { useMemo, useState } from 'react';
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
  /** Pre-loaded teacher class+subject entries (one per subject taught). */
  entries: TeacherClassEntry[];
  /** All school subjects — used as fallback when class doesn't pin one. */
  allSubjects: AcademicLookupItem[];
  /** All grades — used to show a friendly grade name. */
  grades: Grade[];
  /** Curriculum framework (default) — drives the topic catalog query. */
  frameworkId: string;

  classId: string;
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  termNumber: number;

  onClassChange: (entry: TeacherClassEntry | null) => void;
  onSubjectChange: (subjectId: string) => void;
  onTermChange: (n: number) => void;
  onTopicSelect: (node: CurriculumNodeItem) => void;
}

const TERM_NUMBERS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];

export function TopicQuickPicker({
  entries,
  allSubjects,
  grades,
  frameworkId,
  classId,
  subjectId,
  gradeId,
  curriculumNodeId,
  termNumber,
  onClassChange,
  onSubjectChange,
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

  // Each entry is a (class, subject) tuple — render unique tuples so a teacher
  // who teaches Maths AND Physical Sciences to the same class sees both.
  const entryOptions = useMemo(() => {
    return entries
      .filter((e) => !!e.class?.id)
      .map((e) => ({
        key: `${e.class.id}:${e.subject?.id ?? 'homeroom'}`,
        label: e.subject ? `${e.class.name} · ${e.subject.name}` : `${e.class.name} (Homeroom)`,
        entry: e,
      }));
  }, [entries]);

  const selectedEntryKey = useMemo(() => {
    if (!classId) return '';
    const found = entryOptions.find((o) => o.entry.class.id === classId
      && (o.entry.subject?.id ?? 'homeroom') === (subjectId || 'homeroom'));
    return found?.key ?? '';
  }, [classId, subjectId, entryOptions]);

  // If the picked class pinned a subject (single tuple in the teaching load
  // for that class), hide the subject Select.
  const classPinsSubject = useMemo(() => {
    const matching = entries.filter((e) => e.class?.id === classId && e.subject);
    return matching.length === 1 && !!matching[0].subject;
  }, [entries, classId]);

  const recentForContext = useMemo(() => {
    return recent.filter((r: RecentTopic) => {
      if (subjectId && r.subjectId && r.subjectId !== subjectId) return false;
      if (gradeId && r.gradeId && r.gradeId !== gradeId) return false;
      return true;
    });
  }, [recent, subjectId, gradeId]);

  const subjectName = allSubjects.find((s) => s.id === subjectId || s._id === subjectId)?.name;
  const gradeName = grades.find((g) => g.id === gradeId)?.name;
  const contextReady = !!subjectId && !!gradeId;

  return (
    <div className="space-y-4">
      <div>
        <Label>Class <span className="text-destructive">*</span></Label>
        <Select
          value={selectedEntryKey}
          onValueChange={(val: unknown) => {
            const opt = entryOptions.find((o) => o.key === (val as string));
            onClassChange(opt?.entry ?? null);
          }}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Pick a class" />
          </SelectTrigger>
          <SelectContent>
            {entryOptions.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No classes assigned yet.
              </div>
            )}
            {entryOptions.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {classId && !classPinsSubject && (
        <div>
          <Label>Subject <span className="text-destructive">*</span></Label>
          <Select value={subjectId} onValueChange={(v: unknown) => onSubjectChange(v as string)}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Pick a subject" />
            </SelectTrigger>
            <SelectContent>
              {allSubjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
