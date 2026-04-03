'use client';

import { cn } from '@/lib/utils';
import type { RAGStatus } from '@/types';

interface RAGBadgeProps {
  rag: RAGStatus;
  size?: 'sm' | 'md';
}

const RAG_CONFIG: Record<RAGStatus, { label: string; className: string }> = {
  red: {
    label: 'At Risk',
    className: 'bg-destructive/10 text-destructive',
  },
  amber: {
    label: 'Needs Attention',
    className: 'bg-amber-100 text-amber-800',
  },
  green: {
    label: 'On Track',
    className: 'bg-emerald-100 text-emerald-800',
  },
};

export function RAGBadge({ rag, size = 'md' }: RAGBadgeProps) {
  const config = RAG_CONFIG[rag];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      )}
    >
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          rag === 'red' && 'bg-destructive',
          rag === 'amber' && 'bg-amber-500',
          rag === 'green' && 'bg-emerald-500',
        )}
      />
      {config.label}
    </span>
  );
}
