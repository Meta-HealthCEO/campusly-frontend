// STUB — replaced in Task 19
'use client';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function NotesDrawer({ onSubmit: _onSubmit }: Props) {
  return <div className="text-sm text-muted-foreground">Notes drawer (Task 19)</div>;
}
