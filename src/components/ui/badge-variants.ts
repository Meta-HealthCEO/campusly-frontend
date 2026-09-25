import { cva } from 'class-variance-authority';
import { FOCUS_RING } from './focus';

/** Badges and chips: pills (spec §2.4). secure/building/weak carry mastery (spec §2.1); never decoration. */
export const badgeVariants = cva(
  [
    'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent',
    'px-2.5 text-caption font-semibold whitespace-nowrap',
    FOCUS_RING,
    '[&>svg]:pointer-events-none [&>svg]:size-3!',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        secondary: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive-soft text-destructive',
        outline: 'border-border text-foreground',
        ghost: 'text-muted-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        secure: 'bg-secure text-secure-strong',
        building: 'bg-building text-building-strong',
        weak: 'bg-weak text-weak-strong',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
