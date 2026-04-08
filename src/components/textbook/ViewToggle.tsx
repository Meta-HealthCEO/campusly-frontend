'use client';

import { BookOpen, List } from 'lucide-react';

export type ViewMode = 'shelf' | 'list';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => onChange('shelf')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'shelf' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <BookOpen className="size-3.5" />
        Shelf
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <List className="size-3.5" />
        List
      </button>
    </div>
  );
}
