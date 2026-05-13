'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurriculumTopicSelectionList } from '@/components/curriculum/CurriculumTopicSelectionList';
import {
  formatClassLabel,
  getClassGradeId,
  getClassId,
  getSubjectGradeIds,
  type ClassLike,
} from '@/lib/teacher-labels';
import { resolveId } from '@/lib/api-helpers';
import type { SchoolClass, Subject } from '@/types';

export interface ClassSubjectTopicOption {
  _id?: string;
  id?: string;
  title: string;
  code?: string;
  description?: string | null;
}

interface ClassSubjectTopicPickerProps {
  classes: SchoolClass[];
  subjects: Subject[];
  topics: ClassSubjectTopicOption[];
  topicsLoading: boolean;
  classId: string;
  subjectId: string;
  selectedTopicIds: string[];
  onClassChange: (classId: string, gradeId: string) => void;
  onSubjectChange: (subjectId: string, gradeId: string) => void;
  onTopicIdsChange: (topicIds: string[]) => void;
  multipleTopics?: boolean;
  requireTopic?: boolean;
  topicLabel?: string;
  topicHelpText?: string;
  topicEmptyText?: string;
  errors?: {
    classId?: string;
    subjectId?: string;
    topicIds?: string;
  };
}

function subjectIdValue(subject: Subject): string {
  return resolveId(subject);
}

function topicIdValue(topic: ClassSubjectTopicOption): string {
  return topic.id ?? topic._id ?? '';
}

export function ClassSubjectTopicPicker({
  classes,
  subjects,
  topics,
  topicsLoading,
  classId,
  subjectId,
  selectedTopicIds,
  onClassChange,
  onSubjectChange,
  onTopicIdsChange,
  multipleTopics = false,
  requireTopic = true,
  topicLabel = 'CAPS Topic',
  topicHelpText,
  topicEmptyText = 'No topics available for this selection.',
  errors,
}: ClassSubjectTopicPickerProps) {
  const selectedClass = useMemo(
    () => (classes as ClassLike[]).find((cls) => getClassId(cls) === classId),
    [classes, classId],
  );

  const selectedGradeId = getClassGradeId(selectedClass);

  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return subjects.filter((subject) => {
      const gradeIds = getSubjectGradeIds(subject);
      return gradeIds.length === 0 || gradeIds.includes(selectedGradeId);
    });
  }, [subjects, selectedClass, selectedGradeId]);

  const topicOptions = useMemo(
    () => topics
      .map((topic) => ({
        id: topicIdValue(topic),
        title: topic.title,
        code: topic.code,
        description: topic.description,
      }))
      .filter((topic) => topic.id),
    [topics],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Class <span className="text-destructive">*</span>
          </Label>
          <Select
            value={classId || null}
            onValueChange={(nextValue: string | null) => {
              const nextClass = (classes as ClassLike[]).find(
                (cls) => getClassId(cls) === (nextValue ?? ''),
              );
              onClassChange(nextValue ?? '', getClassGradeId(nextClass));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select class">
                {selectedClass ? formatClassLabel(selectedClass) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(classes as ClassLike[]).map((cls) => {
                const id = getClassId(cls);
                if (!id) return null;
                return (
                  <SelectItem key={id} value={id}>
                    {formatClassLabel(cls)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors?.classId && (
            <p className="text-xs text-destructive">{errors.classId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Subject <span className="text-destructive">*</span>
          </Label>
          <Select
            value={subjectId || null}
            onValueChange={(nextValue: string | null) => {
              onSubjectChange(nextValue ?? '', selectedGradeId);
            }}
            disabled={!classId || filteredSubjects.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !classId
                    ? 'Select class first'
                    : filteredSubjects.length === 0
                      ? 'No subjects for this class'
                      : 'Select subject'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredSubjects.map((subject) => {
                const id = subjectIdValue(subject);
                if (!id) return null;
                return (
                  <SelectItem key={id} value={id}>
                    {subject.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors?.subjectId && (
            <p className="text-xs text-destructive">{errors.subjectId}</p>
          )}
        </div>
      </div>

      {subjectId && (
        <div className="space-y-2">
          <Label>
            {topicLabel} {requireTopic && <span className="text-destructive">*</span>}
          </Label>
          {topicHelpText && (
            <p className="text-xs text-muted-foreground">{topicHelpText}</p>
          )}
          <CurriculumTopicSelectionList
            topics={topicOptions}
            selectedIds={selectedTopicIds}
            onSelectedIdsChange={onTopicIdsChange}
            multiple={multipleTopics}
            loading={topicsLoading}
            emptyText={topicEmptyText}
            searchPlaceholder="Search CAPS topics..."
            maxHeightClassName="max-h-56"
          />
          {errors?.topicIds && (
            <p className="text-xs text-destructive">{errors.topicIds}</p>
          )}
        </div>
      )}
    </div>
  );
}
