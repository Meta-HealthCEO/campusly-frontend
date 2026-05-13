'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TopicQuickPicker } from './TopicQuickPicker';
import type { CurriculumNodeItem } from '@/types';

export interface NewLessonStep1Form {
  curriculumNodeId: string;
  /** CurriculumNode subject _id (NOT an academic Subject id). */
  subjectId: string;
  /** CurriculumNode grade _id (NOT an academic Grade id). */
  gradeId: string;
  termNumber: number;
  durationMinutes: number;
  title: string;
}

interface Props {
  form: NewLessonStep1Form;
  update: (patch: Partial<NewLessonStep1Form>) => void;
  frameworkId: string;
  onTopicSelect: (node: CurriculumNodeItem) => void;
}

export function NewLessonStep1({
  form,
  update,
  frameworkId,
  onTopicSelect,
}: Props) {
  return (
    <div className="space-y-4">
      <TopicQuickPicker
        frameworkId={frameworkId}
        subjectId={form.subjectId}
        gradeId={form.gradeId}
        curriculumNodeId={form.curriculumNodeId}
        termNumber={form.termNumber}
        onSubjectChange={(subjectId) =>
          update({ subjectId, curriculumNodeId: '' })
        }
        onGradeChange={(gradeId) =>
          update({ gradeId, subjectId: '', curriculumNodeId: '' })
        }
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
    </div>
  );
}
