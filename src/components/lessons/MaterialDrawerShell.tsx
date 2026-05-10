'use client';

import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function MaterialDrawerShell({ open, onClose, title, children, footer }: Props) {
  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg">
        <header className="border-b pb-3 px-4 pt-4">
          <SheetTitle>{title}</SheetTitle>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t px-4 py-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
