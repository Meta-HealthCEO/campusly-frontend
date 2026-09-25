'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { selectedTopics, topicWeeks, useUnitTopics, type UnitTopic } from '@/hooks/useUnitTopics';
import { resolveId } from '@/lib/api-helpers';
import type { PopulatedId } from '@/types';
import { defaultUnitTitle, schoolTermFor, startingUnitClass } from '@/lib/course-unit';
import type { CreateUnitInput } from '@/hooks/useClassUnit';

const MAX_TOPICS = 8;
const TERMS = [1, 2, 3, 4];

interface Props {
  busy: boolean;
  /** Label for the submit button: "Draft the outline", or "Try again" after a failure. */
  submitLabel: string;
  onSubmit: (input: CreateUnitInput) => void;
  /** Once a unit exists, its scope can't change here. */
  locked?: boolean;
  /** Start on this class (and its subject), e.g. from onboarding. */
  initialClassId?: string | null;
  /** Start with only this CAPS topic ticked, until the teacher changes the topics. */
  preferTopicId?: string | null;
  /** "unit", or "lesson" for standalone teachers. */
  noun?: string;
}

/** Everything except the preferred topic starts unticked; with no (known) preference, nothing does. */
function preferredUnticked(topics: UnitTopic[], preferTopicId: string | null): Set<string> {
  if (!preferTopicId || !topics.some((t: UnitTopic) => t.id === preferTopicId)) return new Set();
  return new Set(topics.filter((t: UnitTopic) => t.id !== preferTopicId).map((t: UnitTopic) => t.id));
}

function gradeNameOf(cls: { gradeName?: string; grade?: { name?: string } | null; gradeId?: unknown }): string {
  const populated = cls.gradeId as { name?: string } | null;
  return cls.gradeName ?? cls.grade?.name ?? (typeof populated === 'object' ? populated?.name ?? '' : '');
}

/** Class, subject, term and CAPS topics: what the AI outlines a unit from. */
export function UnitScopeForm({ busy, submitLabel, onSubmit, locked = false, initialClassId = null, preferTopicId = null, noun = 'unit' }: Props) {
  const { entries, loading: classesLoading } = useTeacherClasses();
  const classes = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; gradeId: string; gradeName: string; subjectId: string }>();
    for (const e of entries) {
      const id = resolveId(e.class as unknown as PopulatedId);
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        id,
        name: e.class.name,
        gradeId: resolveId(e.class.gradeId as unknown as PopulatedId),
        gradeName: gradeNameOf(e.class),
        subjectId: e.subject ? resolveId(e.subject as unknown as PopulatedId) : '',
      });
    }
    return [...seen.values()];
  }, [entries]);

  const [pickedClassId, setClassId] = useState('');
  const classId = pickedClassId || startingUnitClass(classes, initialClassId);
  const [pickedSubjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState(() => schoolTermFor(new Date()));
  const [pickedUnticked, setUnticked] = useState<Set<string> | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  const cls = classes.find((c) => c.id === classId) ?? null;
  // A preset class brings its subject until the teacher picks another.
  const subjectId = pickedSubjectId || cls?.subjectId || '';
  const { subjects } = useTeacherSubjects(cls?.gradeId || undefined);
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const { topics, loading: topicsLoading } = useUnitTopics(subjectId, cls?.gradeId ?? '', term);
  const unticked = pickedUnticked ?? preferredUnticked(topics, preferTopicId);
  const chosen = selectedTopics(topics, unticked, MAX_TOPICS);
  const chosenIds = useMemo(() => new Set(chosen.map((t) => t.id)), [chosen]);
  const shownTitle = title ?? defaultUnitTitle(subject?.name ?? '', cls?.gradeName ?? '', term);
  const ready = !!cls && !!subject && chosen.length > 0 && !busy;

  const pickClass = (value: string): void => {
    setClassId(value);
    setSubjectId(classes.find((c) => c.id === value)?.subjectId ?? '');
    setUnticked(new Set());
  };

  const toggle = (id: string): void => {
    setUnticked(() => {
      const next = new Set(unticked);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = (): void => {
    if (!cls || !subject) return;
    onSubmit({ classId: cls.id, subjectId: subject.id, termNumber: term, topicNodeIds: chosen.map((t) => t.id), title: shownTitle.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="unit-class">Class <span className="text-destructive">*</span></Label>
          <Select value={classId} onValueChange={(v: unknown) => pickClass(String(v))} disabled={locked || classesLoading}>
            <SelectTrigger id="unit-class" className="w-full">
              <SelectValue placeholder={classesLoading ? 'Loading your classes…' : 'Pick a class'}>{cls?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit-subject">Subject <span className="text-destructive">*</span></Label>
          <Select value={subjectId} onValueChange={(v: unknown) => { setSubjectId(String(v)); setUnticked(new Set()); }} disabled={locked || !cls}>
            <SelectTrigger id="unit-subject" className="w-full">
              <SelectValue placeholder={cls ? 'Pick a subject' : 'Pick a class first'}>{subject?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-1.5" disabled={locked}>
        <legend className="text-sm font-medium">Term</legend>
        <div className="grid grid-cols-2 gap-2 sm:flex" role="radiogroup" aria-label="Term">
          {TERMS.map((t) => (
            <Button key={t} type="button" role="radio" aria-checked={term === t} variant={term === t ? 'default' : 'outline'}
              onClick={() => { setTerm(t); setUnticked(new Set()); }} className="min-h-11 flex-1 sm:min-h-9 sm:flex-none">
              Term {t}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-sm font-medium">CAPS topics <span className="font-normal text-muted-foreground">· one module each</span></legend>
        {!cls || !subject ? (
          <p className="text-sm text-muted-foreground">Pick a class and subject to see this term&apos;s CAPS topics.</p>
        ) : topicsLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading CAPS topics…</p>
        ) : topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No CAPS topics are loaded for {subject.name} in Term {term} yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {topics.map((t: UnitTopic) => {
              const on = chosenIds.has(t.id);
              return (
                <li key={t.id}>
                  <label className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${on ? 'border-accent-foreground/40 bg-accent' : 'border-border hover:bg-muted/50'}`}>
                    <Checkbox checked={on} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium">{t.title}</span>
                      {topicWeeks(t) ? <span className="block font-mono text-xs text-muted-foreground">{topicWeeks(t)}</span> : null}
                      {t.description ? <span className="line-clamp-2 block text-xs text-muted-foreground">{t.description}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {topics.length > MAX_TOPICS ? <p className="text-xs text-muted-foreground">A {noun} covers at most {MAX_TOPICS} topics.</p> : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="unit-title">{noun.charAt(0).toUpperCase() + noun.slice(1)} title</Label>
        <Input id="unit-title" value={shownTitle} onChange={(e) => setTitle(e.target.value)} disabled={locked} maxLength={120} className="w-full" />
      </div>

      <Button onClick={submit} disabled={!ready} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {busy ? 'Drafting your outline…' : submitLabel}
      </Button>
    </div>
  );
}
