import Link from 'next/link';
import { ArrowRight, ClipboardList, FileText, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Tile {
  href: string;
  icon: LucideIcon;
  label: string;
  subLabel: string;
}

const tiles = (lessonHref: string): Tile[] => [
  { href: lessonHref, icon: Sparkles, label: 'A lesson', subLabel: 'Slides and notes from a CAPS topic' },
  { href: '/teacher/papers/new', icon: FileText, label: 'A test or exam', subLabel: 'Questions with a memo' },
  { href: '/teacher/homework/new', icon: ClipboardList, label: 'Homework', subLabel: 'Practice that marks itself' },
];

/** Three quick ways into the AI builders. `lessonHref` is the lesson builder this teacher uses. */
export function AIQuickMakeHero({ lessonHref = '/teacher/lessons/new' }: { lessonHref?: string }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {tiles(lessonHref).map((tile: Tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="group flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:border-accent-foreground/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground">
            <tile.icon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-[15px] font-semibold tracking-tight">{tile.label}</span>
            <span className="block truncate text-[12.5px] text-muted-foreground">{tile.subLabel}</span>
          </span>
          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent-foreground"
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
