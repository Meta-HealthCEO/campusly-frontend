/** Spec §2.4: a visible 2px focus ring with a 2px offset on every interactive element. */
export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Spec §2.4: 44px touch targets on phones; from md up controls return to their compact height (ruling R13). */
export const TOUCH_TARGET = 'min-h-11 md:min-h-0';

/** Spec §2.4: 150ms for hover and press, on the standard curve (off under reduced motion, globals.css). */
export const MOTION = 'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-standard';
