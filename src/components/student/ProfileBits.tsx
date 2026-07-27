'use client';

import type { ReactNode } from 'react';

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

/** Icon + label + right-aligned value row for the profile detail card. */
export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="max-w-[60%] truncate text-right text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

interface ThemeOptionProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

/** One of the light/dark/system theme buttons on the profile page. */
export function ThemeOption({ icon, label, active, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
