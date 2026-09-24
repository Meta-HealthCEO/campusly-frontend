'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Short mono context line above the title (teacher portal), e.g. "GRADE 1 A · ENGLISH". */
  eyebrow?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between teacher:sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-heading text-2xl font-bold tracking-tight teacher:mt-1 teacher:text-[32px] teacher:font-semibold teacher:leading-[1.05] teacher:tracking-[-0.025em]">
          {title}
        </h1>
        {description && <p className="text-muted-foreground teacher:mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 teacher:flex-col teacher:items-stretch teacher:sm:flex-row teacher:sm:items-center">{children}</div>}
    </div>
  );
}
