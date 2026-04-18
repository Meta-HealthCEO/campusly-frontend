'use client';

import type { StagedQuizHomework } from '@/types';

interface QuizPickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  onPicked: (hw: StagedQuizHomework) => void;
}

// Stub — real implementation in Task 14.
// Props are accepted but intentionally unused while the picker is a placeholder.
export function QuizPicker(props: QuizPickerProps) {
  void props;
  return (
    <p className="text-sm text-muted-foreground">
      Quiz picker coming soon (Task 14).
    </p>
  );
}
