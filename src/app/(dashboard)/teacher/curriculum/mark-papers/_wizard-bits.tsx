'use client';

// Tiny presentational helpers used only by the mark-papers wizard.
// Lives next to the page to keep the page under the 350-line cap without
// scattering single-use UI fragments into shared components.

import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Check, type LucideProps } from 'lucide-react';

interface SummaryRowProps {
  label: string;
  value: string;
  onChange: () => void;
  changeLabel: string;
}

export function SummaryRow({ label, value, onChange, changeLabel }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Check className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
          {label}
        </span>
        <span className="text-sm font-medium truncate">{value}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange} className="shrink-0">
        {changeLabel}
      </Button>
    </div>
  );
}

interface ModeButtonProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  onClick: () => void;
}

export function ModeButton({ icon: Icon, title, description, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg border bg-card p-4 hover:border-primary hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
