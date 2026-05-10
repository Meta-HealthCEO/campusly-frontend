'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function ActivityDrawer({ onSubmit }: Props) {
  return <ContentBackedDrawerBase kind="activity" contentType="activity" onSubmit={onSubmit} />;
}
