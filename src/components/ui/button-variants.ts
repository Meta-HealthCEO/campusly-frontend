import { cva } from 'class-variance-authority';
import { FOCUS_RING, MOTION, TOUCH_TARGET } from './focus';

/** Spec §4: primary = the one filled cobalt button; outline = secondary; ghost; destructive = neutral surface, 1px destructive edge and text (ruling O1 revised). Names unchanged (ruling R12). */
export const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-transparent bg-clip-padding',
    'text-sm font-semibold whitespace-nowrap select-none',
    MOTION,
    FOCUS_RING,
    'active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted aria-expanded:bg-muted',
        ghost: 'text-foreground hover:bg-muted aria-expanded:bg-muted',
        destructive: 'border-destructive bg-card text-destructive hover:bg-muted aria-expanded:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: `h-9 px-3.5 ${TOUCH_TARGET}`,
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: `h-10 px-4 text-[15px] ${TOUCH_TARGET}`,
        icon: `size-9 ${TOUCH_TARGET} min-w-11 md:min-w-0`,
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': `size-10 ${TOUCH_TARGET} min-w-11 md:min-w-0`,
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
