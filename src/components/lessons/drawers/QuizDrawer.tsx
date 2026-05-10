// STUB — replaced in Task 20
'use client';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function QuizDrawer({ onSubmit: _onSubmit }: Props) {
  return <div className="text-sm text-muted-foreground">Quiz drawer (Task 20)</div>;
}
