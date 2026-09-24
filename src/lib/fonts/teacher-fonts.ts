import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const numeric = JetBrains_Mono({ subsets: ['latin'], variable: '--font-numeric', display: 'swap' });

/** Class names that define --font-display / --font-ui / --font-numeric on an element. */
export const TEACHER_FONT_VARIABLES = `${display.variable} ${ui.variable} ${numeric.variable}`;
