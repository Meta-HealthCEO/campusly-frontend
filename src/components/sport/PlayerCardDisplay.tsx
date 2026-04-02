'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCard } from '@/types/sport';

interface PlayerCardDisplayProps {
  card: PlayerCard;
  className?: string;
}

const TIER_STYLES: Record<PlayerCard['tier'], { bg: string; border: string; text: string; accent: string }> = {
  bronze: {
    bg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30',
    border: 'border-amber-400/60',
    text: 'text-amber-800 dark:text-amber-200',
    accent: 'bg-amber-600',
  },
  silver: {
    bg: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/40 dark:to-slate-600/30',
    border: 'border-slate-400/60',
    text: 'text-slate-700 dark:text-slate-200',
    accent: 'bg-slate-500',
  },
  gold: {
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/30',
    border: 'border-yellow-500/60',
    text: 'text-yellow-800 dark:text-yellow-200',
    accent: 'bg-yellow-500',
  },
  elite: {
    bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/30',
    border: 'border-purple-500/60',
    text: 'text-purple-800 dark:text-purple-200',
    accent: 'bg-purple-600',
  },
};

function FormIcon({ trend }: { trend: PlayerCard['formTrend'] }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function PlayerCardDisplay({ card, className }: PlayerCardDisplayProps) {
  const style = TIER_STYLES[card.tier];
  const attrs = Object.entries(card.attributes).slice(0, 6);

  return (
    <div
      className={cn(
        'relative w-full max-w-[220px] rounded-xl border-2 p-4 shadow-md transition-transform hover:scale-105',
        style.bg, style.border, className,
      )}
    >
      {/* Rating + Position */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center">
          <span className={cn('text-3xl font-extrabold leading-none', style.text)}>
            {card.overallRating}
          </span>
          <span className={cn('mt-0.5 text-[10px] font-semibold uppercase tracking-wider', style.text)}>
            {card.position}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FormIcon trend={card.formTrend} />
          <span className="text-xs capitalize text-muted-foreground">{card.tier}</span>
        </div>
      </div>

      {/* Player name */}
      <h3 className={cn('mt-3 truncate text-center text-sm font-bold uppercase tracking-wide', style.text)}>
        {card.studentName ?? 'Unknown Player'}
      </h3>

      {/* Sport code badge */}
      <div className="mt-1 flex justify-center">
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', style.accent)}>
          {card.sportCode}
        </span>
      </div>

      {/* Attribute bars */}
      <div className="mt-3 space-y-1.5">
        {attrs.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-12 truncate text-[10px] font-medium uppercase text-muted-foreground">
              {key.slice(0, 5)}
            </span>
            <div className="flex-1 rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={cn('h-1.5 rounded-full', style.accent)}
                style={{ width: `${Math.min(value, 99)}%` }}
              />
            </div>
            <span className="w-6 text-right text-[10px] font-bold">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 dark:border-white/10">
        <span className="text-[10px] text-muted-foreground">
          {card.appearances} app{card.appearances !== 1 ? 's' : ''}
        </span>
        {Object.entries(card.keyStats).slice(0, 2).map(([k, v]) => (
          <span key={k} className="text-[10px] text-muted-foreground">
            {k}: <span className="font-bold">{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
