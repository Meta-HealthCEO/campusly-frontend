'use client';

import { useEffect, useState } from 'react';
import { StartFreeLink } from './StartFreeLink';

const SCRIPTS = 50;
const START_DELAY_MS = 1100;
const COUNT_MS = 1400;

/**
 * The campaign's thesis as a live moment: 9:47 PM, fifty scripts unmarked —
 * the count runs, the minute ticks over, 9:48 PM, done. Plays once; with
 * reduced motion it simply shows the finished state.
 */
function useMarkingMinute(): { marked: number; minute: 47 | 48 } {
  const [marked, setMarked] = useState(0);
  const [minute, setMinute] = useState<47 | 48>(47);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const timer = window.setTimeout(() => {
      if (reduced) {
        setMarked(SCRIPTS);
        setMinute(48);
        return;
      }
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / COUNT_MS);
        const eased = 1 - Math.pow(1 - progress, 3);
        setMarked(Math.round(eased * SCRIPTS));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          setMinute(48);
        }
      };
      frame = requestAnimationFrame(step);
    }, reduced ? 0 : START_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { marked, minute };
}

export function NightClockHero() {
  const { marked, minute } = useMarkingMinute();
  const done = minute === 48;

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* Studio light behind the clock — the ads' backdrop, kept faint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-(--violet) opacity-[0.16] blur-[140px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20">
        <p className="text-sm text-(--lavender)">For South African teachers · CAPS, Grade R to 12</p>

        <div aria-hidden className="mt-8 font-(family-name:--font-clock)">
          <p className="flex items-baseline gap-3 text-[clamp(4.5rem,17vw,11rem)] font-semibold leading-none tracking-[-0.06em] tabular-nums">
            <span>
              9<span className="motion-safe:animate-pulse text-(--violet-soft)">:</span>4
              <span key={minute} className={done ? 'inline-block text-(--tick) motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-300' : 'inline-block'}>
                {minute % 10}
              </span>
            </span>
            <span className="text-[0.28em] font-medium tracking-normal text-white/60">PM</span>
          </p>
          <div className="mt-6 max-w-md">
            <div className="flex items-baseline justify-between text-sm tabular-nums">
              <span className={done ? 'text-(--tick)' : 'text-white/70'}>
                {marked} of {SCRIPTS} scripts marked
              </span>
              <span className="text-white/40">{done ? 'done' : 'marking…'}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left rounded-full bg-(--tick) transition-transform duration-100 ease-linear"
                style={{ transform: `scaleX(${marked / SCRIPTS})` }}
              />
            </div>
          </div>
        </div>
        <p className="sr-only">
          At 9:47 PM there are fifty scripts to mark. With Campusly they are marked by 9:48 PM.
        </p>

        <h1 id="hero-heading" className="mt-12 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Get the night back.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
          Campusly marks handwritten scripts against your memo, builds CAPS-aligned papers from one
          sentence, and plans tomorrow&apos;s lesson — so your evening ends at a reasonable hour.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <StartFreeLink className="w-full sm:w-auto" />
          <p className="text-sm text-white/55">
            <span className="font-(family-name:--font-clock) text-white/80">3</span> AI papers free · no card needed
          </p>
        </div>
      </div>
    </section>
  );
}
