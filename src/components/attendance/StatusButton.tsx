import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { statusButtonLabel } from '@/lib/attendance-labels';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

export interface StatusButtonProps {
  status: AttendanceStatus;
  current: AttendanceStatus;
  onClick: () => void;
}

const config: Record<AttendanceStatus, { icon: LucideIcon; activeClass: string }> = {
  present: { icon: CheckCircle2, activeClass: 'bg-success-soft text-success border-success/40' },
  absent: { icon: XCircle, activeClass: 'bg-destructive-soft text-destructive border-destructive/40' },
  late: { icon: Clock, activeClass: 'bg-attention-soft text-attention border-attention/40' },
  excused: { icon: ShieldCheck, activeClass: 'bg-info-soft text-info border-info/40' },
};

/** A register button: icon and word at every width (stacked on phones), at least 44px tall on touch screens. */
export function StatusButton({ status, current, onClick }: StatusButtonProps) {
  const active = current === status;
  const { icon: Icon, activeClass } = config[status];
  const label = statusButtonLabel(status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1.5 text-[11px] font-medium transition-colors',
        'sm:min-h-9 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm',
        active ? activeClass : 'border-border text-muted-foreground hover:bg-muted',
      )}
      aria-pressed={active}
      aria-label={label}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
