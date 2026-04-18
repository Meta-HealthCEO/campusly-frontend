import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

export interface StatusButtonProps {
  status: AttendanceStatus;
  current: AttendanceStatus;
  onClick: () => void;
}

const config: Record<AttendanceStatus, { label: string; icon: React.ReactNode; activeClass: string }> = {
  present: {
    label: 'Present',
    icon: <CheckCircle2 className="h-4 w-4" />,
    activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  absent: {
    label: 'Absent',
    icon: <XCircle className="h-4 w-4" />,
    activeClass: 'bg-destructive/10 text-destructive border-destructive/40',
  },
  late: {
    label: 'Late',
    icon: <Clock className="h-4 w-4" />,
    activeClass: 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/30 dark:text-amber-400',
  },
  excused: {
    label: 'Excused',
    icon: <ShieldCheck className="h-4 w-4" />,
    activeClass: 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

export function StatusButton({ status, current, onClick }: StatusButtonProps) {
  const active = current === status;
  const { label, icon, activeClass } = config[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
        active ? activeClass : 'border-border text-muted-foreground hover:bg-muted',
      ].join(' ')}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
