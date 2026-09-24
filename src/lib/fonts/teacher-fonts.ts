// Not preloaded: the dashboard layout imports these for every role, and only teachers use them.
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap', preload: false });
const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap', preload: false });
const numeric = JetBrains_Mono({ subsets: ['latin'], variable: '--font-numeric', display: 'swap', preload: false });

/** Class names that define --font-display / --font-ui / --font-numeric on an element. */
export const TEACHER_FONT_VARIABLES = `${display.variable} ${ui.variable} ${numeric.variable}`;
