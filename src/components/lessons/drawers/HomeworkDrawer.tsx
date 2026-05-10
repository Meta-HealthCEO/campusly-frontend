// STUB — replaced in Task 21
'use client';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function HomeworkDrawer({ onSubmit: _onSubmit }: Props) {
  return <div className="text-sm text-muted-foreground">Homework drawer (Task 21)</div>;
}
