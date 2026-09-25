'use client';

import { GraduationCap } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { FOCUS_RING } from '@/components/ui/focus';
import { cn } from '@/lib/utils';
import { TokenTable } from './TokenTable';
import { TypeScale } from './TypeScale';
import { ControlStates } from './ControlStates';
import { DataStates } from './DataStates';
import { ReadinessExamples } from './ReadinessExamples';

const SECTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'type', label: 'Type' },
  { id: 'controls', label: 'Controls' },
  { id: 'data', label: 'Data' },
  { id: 'readiness', label: 'Readiness' },
] as const;

/** The dev-only Blueprint reference (spec §5): tokens with contrast, type, every component state, readiness examples. */
export function DesignGallery() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary text-primary-foreground">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-h3 font-bold tracking-[-0.015em]">Blueprint</h1>
              <p className="truncate text-caption text-muted-foreground">The reference for Phase D reviews. Flip the theme to check dark.</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav aria-label="Gallery sections" className="mx-auto max-w-[1200px] px-2 md:px-6">
          <ul className="flex flex-wrap gap-1 pb-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn('inline-flex min-h-9 items-center rounded-full px-3 text-small font-semibold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground', FOCUS_RING)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-[1200px] space-y-16 px-4 py-8 md:px-8 md:py-12">
        <TokenTable />
        <TypeScale />
        <ControlStates />
        <DataStates />
        <ReadinessExamples />
      </main>
    </div>
  );
}
