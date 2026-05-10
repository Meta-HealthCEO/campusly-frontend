'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function WorksheetDrawer({ onSubmit }: Props) {
  return <ContentBackedDrawerBase kind="worksheet" contentType="worksheet" onSubmit={onSubmit} />;
}
