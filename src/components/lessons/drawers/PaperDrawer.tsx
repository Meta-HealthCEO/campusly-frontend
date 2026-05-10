// STUB — replaced in Task 21
'use client';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function PaperDrawer({ onSubmit: _onSubmit }: Props) {
  return <div className="text-sm text-muted-foreground">Paper drawer (Task 21)</div>;
}
