'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chipFor, type ChipStatus, type ChipTone } from '@/lib/status-chip';

const TONE: Record<ChipTone, { chip: string; dot: string }> = {
  success: { chip: 'bg-success-soft text-success', dot: 'bg-success' },
  attention: { chip: 'bg-attention-soft text-attention', dot: 'bg-attention' },
  destructive: { chip: 'bg-destructive-soft text-destructive', dot: 'bg-destructive' },
  info: { chip: 'bg-info-soft text-info', dot: 'bg-info' },
  quiet: { chip: 'border border-border text-muted-foreground', dot: 'bg-border' },
  accent: { chip: 'bg-accent-soft text-accent', dot: '' },
};

interface StatusChipProps {
  status: ChipStatus;
  label?: string;
  className?: string;
}

/** One status vocabulary for the teacher portal: a dot, a colour role and a short label. */
export function StatusChip({ status, label, className }: StatusChipProps) {
  const { tone, label: fallback } = chipFor(status);
  const style = TONE[tone];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium', style.chip, className)}>
      {tone === 'accent'
        ? <Sparkles className="h-3 w-3" aria-hidden />
        : <i className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />}
      {label ?? fallback}
    </span>
  );
}
