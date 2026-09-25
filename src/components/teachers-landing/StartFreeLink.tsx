import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StartFreeLinkProps {
  size?: 'sm' | 'lg';
  className?: string;
}

/** The page's one call to action — every "Start free" goes to teacher sign-up. */
export function StartFreeLink({ size = 'lg', className }: StartFreeLinkProps) {
  return (
    <Link
      href="/signup/teacher"
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-(--violet) font-semibold text-white',
        'transition-[background-color,transform] duration-150 hover:bg-[#6d28d9] active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lavender)',
        size === 'lg' ? 'h-12 px-6 text-base' : 'h-9 px-4 text-sm',
        className,
      )}
    >
      Start free
    </Link>
  );
}
