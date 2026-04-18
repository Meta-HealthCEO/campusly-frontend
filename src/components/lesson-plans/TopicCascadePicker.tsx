'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { SchoolClass, Subject } from '@/types';
import type { CurriculumTopicOption } from '@/hooks/useTeacherLessonPlans';

interface TopicCascadePickerProps {
  classes: SchoolClass[];
  subjects: Subject[];
  topics: CurriculumTopicOption[];
  topicsLoading: boolean;
  classId: string;
  subjectId: string;
  curriculumTopicId: string;
  onClassChange: (classId: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onTopicChange: (topicId: string) => void;
  errors?: {
    classId?: string;
    subjectId?: string;
    curriculumTopicId?: string;
  };
}

export function TopicCascadePicker({
  classes, subjects, topics, topicsLoading,
  classId, subjectId, curriculumTopicId,
  onClassChange, onSubjectChange, onTopicChange,
  errors,
}: TopicCascadePickerProps) {
  const [topicSearch, setTopicSearch] = useState('');

  const selectedClass = useMemo(
    () => classes.find((c: SchoolClass) => c.id === classId),
    [classes, classId],
  );

  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return subjects.filter((s: Subject) => s.gradeId === selectedClass.gradeId);
  }, [subjects, selectedClass]);

  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return topics;
    const q = topicSearch.trim().toLowerCase();
    return topics.filter((t: CurriculumTopicOption) => {
      return (
        t.title.toLowerCase().includes(q)
        || (t.code ?? '').toLowerCase().includes(q)
      );
    });
  }, [topics, topicSearch]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Class <span className="text-destructive">*</span></Label>
        <Select
          value={classId || ''}
          onValueChange={(val: unknown) => onClassChange(val as string)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c: SchoolClass) => (
              <SelectItem key={c.id} value={c.id}>
                {c.grade?.name ?? c.gradeName ?? ''} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.classId && (
          <p className="text-xs text-destructive">{errors.classId}</p>
        )}
      </div>

      {classId && (
        <div className="space-y-2">
          <Label>Subject <span className="text-destructive">*</span></Label>
          <Select
            value={subjectId || ''}
            onValueChange={(val: unknown) => onSubjectChange(val as string)}
            disabled={filteredSubjects.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  filteredSubjects.length === 0
                    ? 'No subjects for this grade'
                    : 'Select subject'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredSubjects.map((s: Subject) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.subjectId && (
            <p className="text-xs text-destructive">{errors.subjectId}</p>
          )}
        </div>
      )}

      {subjectId && (
        <div className="space-y-2">
          <Label>Curriculum Topic <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Search topics..."
            value={topicSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopicSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto border rounded-md">
            {topicsLoading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Loading topics...
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                {topics.length === 0 ? 'No topics available' : 'No topics match your search'}
              </div>
            ) : (
              filteredTopics.map((t: CurriculumTopicOption) => (
                <button
                  type="button"
                  key={t._id}
                  onClick={() => onTopicChange(t._id)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                    curriculumTopicId === t._id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="font-medium truncate">{t.title}</div>
                  {t.code && (
                    <div className="text-xs text-muted-foreground truncate">{t.code}</div>
                  )}
                </button>
              ))
            )}
          </div>
          {errors?.curriculumTopicId && (
            <p className="text-xs text-destructive">{errors.curriculumTopicId}</p>
          )}
        </div>
      )}
    </div>
  );
}
