import Link from 'next/link';
import { Sparkles, FileText, ClipboardList } from 'lucide-react';

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
          className="group flex min-h-30 flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10"
        >
          <tile.icon className="h-7 w-7 text-primary" />
          <div className="space-y-0.5">
            <p className="text-base font-semibold group-hover:text-primary">{tile.label}</p>
            <p className="text-xs text-muted-foreground">{tile.subLabel}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
