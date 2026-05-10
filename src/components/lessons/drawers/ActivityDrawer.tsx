'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';
import type { ActivityMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: ActivityMaterial;
}

export function ActivityDrawer({ onSubmit, existing }: Props) {
  return (
    <ContentBackedDrawerBase
      kind="activity"
      contentType="activity"
      onSubmit={onSubmit}
      existing={existing}
    />
  );
}
