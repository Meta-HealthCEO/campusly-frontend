'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TopicQuickPicker } from './TopicQuickPicker';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { AcademicLookupItem } from '@/hooks/useAcademicLookups';
import type { CurriculumNodeItem, Grade } from '@/types';

export interface NewLessonStep1Form {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  termNumber: number;
  date: string;
  durationMinutes: number;
  title: string;
}

interface Props {
  form: NewLessonStep1Form;
  update: (patch: Partial<NewLessonStep1Form>) => void;
  entries: TeacherClassEntry[];
  subjects: AcademicLookupItem[];
  grades: Grade[];
  frameworkId: string;
  onClassChange: (entry: TeacherClassEntry | null) => void;
  onTopicSelect: (node: CurriculumNodeItem) => void;
  onNext: () => void;
}

export function NewLessonStep1({
  form,
  update,
  entries,
  subjects,
  grades,
  frameworkId,
  onClassChange,
  onTopicSelect,
  onNext,
}: Props) {
  const canProceed =
    !!form.curriculumNodeId && !!form.classId && !!form.subjectId && !!form.gradeId;

  return (
    <div className="space-y-4">
      <TopicQuickPicker
        entries={entries}
        allSubjects={subjects}
        grades={grades}
        frameworkId={frameworkId}
        classId={form.classId}
        subjectId={form.subjectId}
        gradeId={form.gradeId}
        curriculumNodeId={form.curriculumNodeId}
        termNumber={form.termNumber}
        onClassChange={onClassChange}
        onSubjectChange={(subjectId) => update({ subjectId })}
        onTermChange={(termNumber) => update({ termNumber })}
        onTopicSelect={onTopicSelect}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Date <span className="text-destructive">*</span></Label>
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
