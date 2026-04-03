'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChapterItem } from '@/types';

interface TextbookSidebarProps {
  chapters: ChapterItem[];
  activeIndex: number;
  sidebarOpen: boolean;
  onSelectChapter: (idx: number) => void;
  onClose: () => void;
}

export function TextbookSidebar({
  chapters,
  activeIndex,
  sidebarOpen,
  onSelectChapter,
  onClose,
}: TextbookSidebarProps) {
  return (
    <aside
      className={`${
        sidebarOpen
          ? 'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm sm:static sm:z-auto sm:bg-transparent sm:backdrop-blur-none'
          : 'hidden sm:block'
      } sm:w-56 shrink-0`}
    >
      <div
        className={`${
          sidebarOpen ? 'w-64 h-full bg-card p-4 shadow-lg' : ''
        } sm:w-auto sm:h-auto sm:bg-transparent sm:p-0 sm:shadow-none space-y-1`}
      >
        {sidebarOpen && (
          <Button variant="ghost" size="sm" className="mb-2 sm:hidden" onClick={onClose}>
            Close
          </Button>
        )}

        {/* Mobile: dropdown */}
        <div className="sm:hidden mb-3">
          <Select
            value={String(activeIndex)}
            onValueChange={(v: unknown) => onSelectChapter(Number(v as string))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((ch: ChapterItem, idx: number) => (
                <SelectItem key={ch.id} value={String(idx)}>
                  {idx + 1}. {ch.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: chapter list */}
        <nav className="hidden sm:block space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Contents
          </p>
          {chapters.map((ch: ChapterItem, idx: number) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelectChapter(idx)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-md truncate transition-colors ${
                idx === activeIndex
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {idx + 1}. {ch.title}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
