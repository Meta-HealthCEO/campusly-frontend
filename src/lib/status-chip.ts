export type ChipTone = 'success' | 'attention' | 'destructive' | 'info' | 'quiet' | 'accent';
export type ChipStatus =
  | 'present' | 'absent' | 'late' | 'excused' | 'done' | 'marked'
  | 'pending' | 'overdue' | 'due' | 'draft' | 'published' | 'ai';

/** One meaning per colour (look-design spec §5.2). */
const CHIPS: Record<ChipStatus, { tone: ChipTone; label: string }> = {
  present: { tone: 'success', label: 'Present' },
  done: { tone: 'success', label: 'Done' },
  marked: { tone: 'success', label: 'Marked' },
  published: { tone: 'success', label: 'Published' },
  late: { tone: 'attention', label: 'Late' },
  due: { tone: 'attention', label: 'Due' },
  overdue: { tone: 'attention', label: 'Overdue' },
  pending: { tone: 'attention', label: 'To mark' },
  absent: { tone: 'destructive', label: 'Absent' },
  excused: { tone: 'info', label: 'Excused' },
  draft: { tone: 'quiet', label: 'Draft' },
  ai: { tone: 'accent', label: 'AI draft' },
};

export function chipFor(status: ChipStatus): { tone: ChipTone; label: string } {
  return CHIPS[status];
}
