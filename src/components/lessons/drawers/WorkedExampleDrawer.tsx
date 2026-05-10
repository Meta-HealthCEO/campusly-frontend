'use client';

import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function WorkedExampleDrawer({ onSubmit }: Props) {
  return (
    <ContentBackedDrawerBase
      kind="worked_example"
      contentType="worked_example"
      onSubmit={onSubmit}
    />
  );
}
