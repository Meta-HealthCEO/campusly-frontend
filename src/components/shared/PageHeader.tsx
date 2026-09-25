'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Short context line above the title, e.g. "GRADE 1 A · ENGLISH". */
  eyebrow?: string;
  /** The page's one primary action (spec §4). */
  children?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-8">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-eyebrow font-semibold uppercase text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-heading text-h1 font-bold tracking-[-0.025em] text-balance md:text-h1-desktop">{title}</h1>
        {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>}
    </header>
  );
}
