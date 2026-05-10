'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function NotesDrawer({ onSubmit }: Props) {
  return <ContentBackedDrawerBase kind="notes" contentType="study_notes" onSubmit={onSubmit} />;
}
