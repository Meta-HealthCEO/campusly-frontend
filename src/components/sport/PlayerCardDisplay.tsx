'use client';

import { TrendingUp, TrendingDown, Minus, Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCard } from '@/types/sport';

interface PlayerCardDisplayProps {
  card: PlayerCard;
  className?: string;
}

const TIER_STYLES: Record<PlayerCard['tier'], {
  bg: string; border: string; text: string; accent: string;
  ring: string; label: string;
}> = {
  bronze: {
    bg: 'bg-gradient-to-br from-orange-700 via-amber-700 to-orange-900',
    border: 'border-orange-900',
    text: 'text-orange-50',
    accent: 'bg-orange-950',
    ring: 'ring-2 ring-orange-800/60',
    label: 'bg-orange-950 text-orange-200',
  },
  silver: {
    bg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500',
    border: 'border-slate-500',
    text: 'text-slate-900',
    accent: 'bg-slate-700',
    ring: 'ring-2 ring-slate-400/60',
    label: 'bg-slate-700 text-slate-100',
  },
  gold: {
    bg: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500',
    border: 'border-yellow-600',
    text: 'text-yellow-950',
    accent: 'bg-yellow-700',
    ring: 'ring-4 ring-yellow-400/60 shadow-lg shadow-yellow-500/30',
    label: 'bg-yellow-700 text-yellow-50',
  },
  elite: {
    bg: 'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700',
    border: 'border-purple-800',
    text: 'text-white',
    accent: 'bg-purple-900',
    ring: 'ring-4 ring-purple-400/70 shadow-xl shadow-purple-500/40',
    label: 'bg-purple-900 text-white',
  },
};

const TIER_ICON: Record<PlayerCard['tier'], React.ReactNode> = {
  bronze: null,
  silver: null,
  gold: <Star className="h-3 w-3 fill-current" />,
  elite: <Crown className="h-3 w-3 fill-current" />,
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
        style.bg, style.border, style.ring, className,
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
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            style.label,
          )}>
            {TIER_ICON[card.tier]}
            {card.tier}
          </span>
          <FormIcon trend={card.formTrend} />
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
