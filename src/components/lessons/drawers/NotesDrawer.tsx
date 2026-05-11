'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';
import type { NotesMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: NotesMaterial;
}

export function NotesDrawer({ onSubmit, existing }: Props) {
  return (
    <ContentBackedDrawerBase
      kind="study_notes"
      contentType="study_notes"
      onSubmit={onSubmit}
      existing={existing}
    />
  );
}
