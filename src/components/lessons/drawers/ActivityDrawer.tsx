// STUB — replaced in Task 19
'use client';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function ActivityDrawer({ onSubmit: _onSubmit }: Props) {
  return <div className="text-sm text-muted-foreground">Activity drawer (Task 19)</div>;
}
