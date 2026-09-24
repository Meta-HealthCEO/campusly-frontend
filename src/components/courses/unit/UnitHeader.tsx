import { StatusChip } from '@/components/shared/StatusChip';
import { formatMinutes, unitChip, unitMinutes } from '@/lib/course-unit';
import type { CourseTree } from '@/types/courses';

/** Title, what the unit covers, how long it takes, and where it's at. */
export function UnitHeader({ course, children }: { course: CourseTree; children?: React.ReactNode }) {
  const subject = typeof course.subjectId === 'object' && course.subjectId ? course.subjectId.name : '';
  const chip = unitChip(course);
  const itemCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const meta = [
    subject,
    course.scope ? `Term ${course.scope.termNumber}` : '',
    `${course.modules.length} module${course.modules.length === 1 ? '' : 's'}`,
    itemCount > 0 ? `${itemCount} items · ${formatMinutes(unitMinutes(course))}` : '',
  ].filter(Boolean);
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <StatusChip status={chip.status} label={chip.label} />
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{course.title}</h1>
        <p className="text-sm text-muted-foreground">{meta.join(' · ')}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{children}</div> : null}
    </header>
  );
}
