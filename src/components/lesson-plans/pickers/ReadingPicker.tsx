'use client';

import type { StagedReadingHomework } from '@/types';

interface ReadingPickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  onPicked: (hw: StagedReadingHomework) => void;
}

// Stub — real implementation in Task 15.
// Props are accepted but intentionally unused while the picker is a placeholder.
export function ReadingPicker(props: ReadingPickerProps) {
  void props;
  return (
    <p className="text-sm text-muted-foreground">
      Reading picker coming soon (Task 15).
    </p>
  );
}
