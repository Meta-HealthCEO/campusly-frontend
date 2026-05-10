// STUB — replaced in Task 17
'use client';

import type { LessonMaterial } from '@/types/lesson';

interface Props {
  lessonId: string;
  addMaterial: (payload: Record<string, unknown>) => Promise<LessonMaterial>;
}

export function MaterialDrawer(_props: Props) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[MaterialDrawer] STUB — replaced in Task 17');
  }
  return null;
}
