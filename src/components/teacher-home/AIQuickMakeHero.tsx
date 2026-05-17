import Link from 'next/link';
import { Sparkles, FileText, ClipboardList, ChevronRight } from 'lucide-react';

interface Tile {
  href: string;
  icon: typeof Sparkles;
  label: string;
  subLabel: string;
}

const TILES: Tile[] = [
  {
    href: '/teacher/lessons/new',
    icon: Sparkles,
    label: 'Make a lesson',
    subLabel: 'Slides & explanations',
  },
  {
    href: '/teacher/papers/new',
    icon: FileText,
    label: 'Make a paper',
    subLabel: 'Test or exam with memo',
  },
  {
    href: '/teacher/homework/new',
    icon: ClipboardList,
    label: 'Set homework',
    subLabel: 'Practice tasks with auto-marking',
  },
];

export function AIQuickMakeHero() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TILES.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="group flex min-h-35 flex-col justify-between rounded-xl border border-border/40 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
            <tile.icon className="size-8 text-foreground" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-base font-semibold text-foreground">{tile.label}</p>
              <p className="text-xs text-muted-foreground truncate">{tile.subLabel}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
