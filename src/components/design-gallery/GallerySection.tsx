import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GallerySectionProps {
  id: string;
  /** Two-digit running number shown as the eyebrow, e.g. "01". */
  index: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** One numbered block of the /design gallery: eyebrow, h2, one line on what to check, then the specimens. */
export function GallerySection({ id, index, title, description, children }: GallerySectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-5">
      <div className="space-y-1 border-b border-border pb-4">
        <p className="text-eyebrow font-semibold uppercase text-primary">{index}</p>
        <h2 id={id} className="scroll-mt-32 font-heading text-h2 font-bold tracking-[-0.02em]">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface SpecimenProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** A labelled specimen card inside a gallery section. */
export function Specimen({ title, children, className }: SpecimenProps) {
  return (
    <div className={cn('min-w-0 space-y-3 rounded-card border border-border bg-card p-4 shadow-card sm:p-5', className)}>
      <h3 className="text-eyebrow font-semibold uppercase text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
