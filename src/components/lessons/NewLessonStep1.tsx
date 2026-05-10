'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TopicQuickPicker } from './TopicQuickPicker';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { CurriculumNodeItem, Grade } from '@/types';

export interface NewLessonStep1Form {
  curriculumNodeId: string;
  subjectId: string;
  gradeId: string;
  termNumber: number;
  durationMinutes: number;
  title: string;
}

interface Props {
  form: NewLessonStep1Form;
  update: (patch: Partial<NewLessonStep1Form>) => void;
  entries: TeacherClassEntry[];
  grades: Grade[];
  frameworkId: string;
  onTopicSelect: (node: CurriculumNodeItem) => void;
  onNext: () => void;
}

export function NewLessonStep1({
  form,
  update,
  entries,
  grades,
  frameworkId,
  onTopicSelect,
  onNext,
}: Props) {
  // Class is no longer required at create time — it's assigned in the
  // workspace afterwards. The pack just needs a topic + subject + grade.
  const canProceed =
    !!form.curriculumNodeId && !!form.subjectId && !!form.gradeId;

  return (
    <div className="space-y-4">
      <TopicQuickPicker
        entries={entries}
        grades={grades}
        frameworkId={frameworkId}
        subjectId={form.subjectId}
        gradeId={form.gradeId}
        curriculumNodeId={form.curriculumNodeId}
        termNumber={form.termNumber}
        onSubjectChange={(subjectId) =>
          update({ subjectId, gradeId: '', curriculumNodeId: '' })
        }
        onGradeChange={(gradeId) => update({ gradeId, curriculumNodeId: '' })}
        onTermChange={(termNumber) => update({ termNumber })}
        onTopicSelect={onTopicSelect}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
