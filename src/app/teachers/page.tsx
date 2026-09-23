import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { TeachersHeader } from '@/components/teachers-landing/TeachersHeader';
import { NightClockHero } from '@/components/teachers-landing/NightClockHero';
import { EveningTimeline } from '@/components/teachers-landing/EveningTimeline';
import { MorningBand } from '@/components/teachers-landing/MorningBand';
import { TeacherPlans } from '@/components/teachers-landing/TeacherPlans';
import { ClosingCta } from '@/components/teachers-landing/ClosingCta';

export const metadata: Metadata = {
  title: 'Campusly for teachers — get the night back',
  description:
    'AI marking against your memo, CAPS-aligned papers from one sentence, and lessons planned in minutes. Free for South African teachers to start.',
};

// The ad campaign's mono face: every time and number on this page uses it.
const clockFace = JetBrains_Mono({ subsets: ['latin'], variable: '--font-clock', display: 'swap' });

// Campaign palette (campusly-remotion/src/brand.ts), as page-scoped tokens.
const TOKENS = {
  '--ink': '#070912',
  '--midnight': '#0d1224',
  '--violet': '#7c3aed',
  '--violet-soft': '#a78bfa',
  '--lavender': '#c4b5fd',
  '--tick': '#34d399',
  '--dawn': '#f5f6fb',
} as CSSProperties;

/** Landing page for independent teachers — the destination for the "Get the night back" ads. */
export default function TeachersLandingPage() {
  return (
    <div className={`${clockFace.variable} min-h-screen bg-(--ink) text-white`} style={TOKENS}>
      <TeachersHeader />
      <main>
        <NightClockHero />
        <EveningTimeline />
        <MorningBand />
        <TeacherPlans />
        <ClosingCta />
      </main>
    </div>
  );
}
