'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useModule } from '@/hooks/useModule';
import { useAuthStore } from '@/stores/useAuthStore';
import { phoneNavLayout, visibleNavItems } from '@/lib/nav-visibility';
import type { NavItem } from '@/lib/constants';

interface BottomNavProps {
  items: NavItem[];
}

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { primary, sheet } = phoneNavLayout(visibleNavItems(items, { isModuleEnabled, hasPermission }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden">
      <div className="flex items-center justify-around">
        {primary.map((item: NavItem) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs transition-colors',
                isActivePath(pathname, item.href) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {sheet.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs text-muted-foreground transition-colors">
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </SheetTrigger>
            <SheetContent side="bottom" showCloseButton={false}>
              <SheetTitle className="sr-only">More navigation</SheetTitle>
              <div className="grid max-h-[70vh] grid-cols-3 gap-3 overflow-y-auto p-4 pb-6 sm:grid-cols-4">
                {sheet.map((item: NavItem) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex min-h-11 flex-col items-center gap-1.5 rounded-lg p-2 text-xs transition-colors',
                        isActivePath(pathname, item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
