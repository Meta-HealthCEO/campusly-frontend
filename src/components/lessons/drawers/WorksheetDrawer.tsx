'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';
import type { WorksheetMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: WorksheetMaterial;
}

export function WorksheetDrawer({ onSubmit, existing }: Props) {
  return (
    <ContentBackedDrawerBase
      kind="worksheet"
      contentType="worksheet"
      onSubmit={onSubmit}
      existing={existing}
    />
  );
}
