'use client';

import {
  CurriculumTreeBrowser,
  type CurriculumTreeBrowserSelectContext,
} from '@/components/curriculum/CurriculumTreeBrowser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AcademicLookupItem } from '@/hooks/useAcademicLookups';
import type { CurriculumNodeItem, CurriculumFrameworkItem, Grade } from '@/types';

export interface NewLessonStep1Form {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  date: string;
  durationMinutes: number;
  title: string;
}

interface Props {
  form: NewLessonStep1Form;
  update: (patch: Partial<NewLessonStep1Form>) => void;
  classes: AcademicLookupItem[];
  subjects: AcademicLookupItem[];
  grades: Grade[];
  frameworks: CurriculumFrameworkItem[];
  selectedFramework: string;
  setSelectedFramework: (id: string) => void;
  onTopicSelect: (
    node: CurriculumNodeItem,
    ctx?: CurriculumTreeBrowserSelectContext,
  ) => void;
  onNext: () => void;
}

export function NewLessonStep1({
  form,
  update,
  classes,
  subjects,
  grades,
  frameworks,
  selectedFramework,
  setSelectedFramework,
  onTopicSelect,
  onNext,
}: Props) {
  const canProceed =
    !!form.curriculumNodeId && !!form.classId && !!form.subjectId && !!form.gradeId;

  const subjectName = subjects.find((s) => s._id === form.subjectId)?.name;
  const gradeName = grades.find((g) => g.id === form.gradeId)?.name;
  const autoDerived = !!subjectName && !!gradeName;
  const topicPicked = !!form.curriculumNodeId;
  const needsManualGradeSubject = topicPicked && !autoDerived;

  return (
    <div className="space-y-4">
      {frameworks.length > 1 && (
        <div>
          <Label>Curriculum framework</Label>
          <Select
            value={selectedFramework}
            onValueChange={(v: unknown) => setSelectedFramework(v as string)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Pick a framework" />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Curriculum topic <span className="text-destructive">*</span></Label>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border p-1 mt-1">
          {selectedFramework ? (
            <CurriculumTreeBrowser
              frameworkId={selectedFramework}
              selectedNodeId={form.curriculumNodeId || null}
              onSelect={onTopicSelect}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Loading frameworks...</p>
          )}
        </div>
        {autoDerived && (
          <p className="mt-2 text-xs text-muted-foreground">
            Detected from topic: <span className="font-medium text-foreground">{gradeName}</span>
            {' · '}
            <span className="font-medium text-foreground">{subjectName}</span>
          </p>
        )}
      </div>

      {needsManualGradeSubject && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Could not auto-detect Subject or Grade from the chosen topic. Pick them manually below.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Class <span className="text-destructive">*</span></Label>
          <Select value={form.classId} onValueChange={(v: unknown) => update({ classId: v as string })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pick a class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsManualGradeSubject && (
          <>
            <div>
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={form.subjectId} onValueChange={(v: unknown) => update({ subjectId: v as string })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade <span className="text-destructive">*</span></Label>
              <Select value={form.gradeId} onValueChange={(v: unknown) => update({ gradeId: v as string })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => update({ date: e.target.value })}
            className="w-full"
          />
        </div>
        <div>
          <Label>Duration (min)</Label>
          <Input
            type="number"
            min={5}
            max={480}
            value={form.durationMinutes}
            onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <Label>Title (optional)</Label>
          <Input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Defaults to topic title"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={!canProceed} onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}
