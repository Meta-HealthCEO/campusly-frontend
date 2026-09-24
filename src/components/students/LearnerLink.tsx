import Link from 'next/link';
import { teacherLearnerProfilePath } from '@/lib/learner-profile';
import { cn } from '@/lib/utils';

interface Props {
  /** The learner's Student id; without one the name shows as plain text. */
  studentId?: string | null;
  name: string;
  className?: string;
}

/** A learner's name that opens their profile (teacher screens only). */
export function LearnerLink({ studentId, name, className }: Props) {
  if (!studentId) return <span className={className}>{name}</span>;
  return (
    <Link
      href={teacherLearnerProfilePath(studentId)}
      // Rows that open or expand on click shouldn't also react to the name.
      onClick={(e) => e.stopPropagation()}
      className={cn('underline underline-offset-2 focus-visible:outline-none', className)}
    >
      {name}
    </Link>
  );
}
