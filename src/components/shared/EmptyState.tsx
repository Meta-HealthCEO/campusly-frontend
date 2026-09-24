'use client';

import { InboxIcon } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = InboxIcon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4 teacher:rounded-xl teacher:bg-accent-soft">
        <Icon className="h-8 w-8 text-muted-foreground teacher:h-7 teacher:w-7 teacher:text-accent-foreground" />
      </div>
      <h3 className="font-heading text-lg font-semibold teacher:text-xl teacher:tracking-tight">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
