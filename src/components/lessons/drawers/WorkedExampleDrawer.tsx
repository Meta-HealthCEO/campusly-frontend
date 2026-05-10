'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';
import type { WorkedExampleMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: WorkedExampleMaterial;
}

export function WorkedExampleDrawer({ onSubmit, existing }: Props) {
  return (
    <ContentBackedDrawerBase
      kind="worked_example"
      contentType="worked_example"
      onSubmit={onSubmit}
      existing={existing}
    />
  );
}
