'use client';

import type { StagedExerciseHomework } from '@/types';

interface ExercisePickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  onPicked: (hw: StagedExerciseHomework) => void;
}

// Stub — real implementation in Task 16.
// Props are accepted but intentionally unused while the picker is a placeholder.
export function ExercisePicker(props: ExercisePickerProps) {
  void props;
  return (
    <p className="text-sm text-muted-foreground">
      Exercise picker coming soon (Task 16).
    </p>
  );
}
