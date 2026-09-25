import { cva } from 'class-variance-authority';
import { FOCUS_RING } from './focus';

/**
 * A status chip (orchestrator ruling O1 revised): a solid 8px dot in the semantic colour and the label in foreground
 * text, on no fill. Colour lives only in the dot.
 */
const DOT = "bg-transparent text-foreground before:size-2 before:shrink-0 before:rounded-full before:content-['']";

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
        default: 'bg-muted text-foreground',
        secondary: 'bg-muted text-muted-foreground',
        outline: 'border-border text-foreground',
        ghost: 'text-muted-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive: `${DOT} gap-1.5 px-1 before:bg-destructive`,
        success: `${DOT} gap-1.5 px-1 before:bg-success`,
        attention: `${DOT} gap-1.5 px-1 before:bg-attention`,
        info: `${DOT} gap-1.5 px-1 before:bg-info`,
        secure: `${DOT} gap-1.5 px-1 before:bg-mark-secure`,
        building: `${DOT} gap-1.5 px-1 before:bg-mark-building`,
        weak: `${DOT} gap-1.5 px-1 before:bg-mark-weak`,
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
