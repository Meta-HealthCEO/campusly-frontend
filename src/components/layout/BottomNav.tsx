'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useModule } from '@/hooks/useModule';
import { useAuthStore } from '@/stores/useAuthStore';
import { visibleNavItems, type PhoneTab } from '@/lib/nav-visibility';
import { isTabActive, phoneTabs } from '@/lib/shell/phone-tabs';
import { TAB_CLASS } from '@/lib/bottom-nav-classes';
import { FOCUS_RING } from '@/components/ui/focus';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { NavItem } from '@/lib/constants';

interface BottomNavProps {
  items: NavItem[];
}

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function TabBody({ tab, active }: { tab: PhoneTab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <>
      <span aria-hidden="true" className={cn('absolute top-0 h-[3px] w-6 rounded-b-full', active ? 'bg-primary' : 'bg-transparent')} />
      <Icon className="size-5" aria-hidden="true" />
      <span>{tab.label}</span>
    </>
  );
}

/** Spec §3: phones only; section or first-four tabs, the rest in a sheet; clear of the home bar. */
export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const tabs = phoneTabs(visibleNavItems(items, { isModuleEnabled, hasPermission }));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = tabs.find((t: PhoneTab) => t.key === openKey);

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex items-stretch">
        {tabs.map((tab: PhoneTab) => {
          const active = isTabActive(pathname, tab);
          const className = cn(TAB_CLASS, FOCUS_RING, active ? 'text-primary' : 'text-muted-foreground');
          return tab.href ? (
            <Link key={tab.key} href={tab.href} aria-current={active ? 'page' : undefined} className={className}>
              <TabBody tab={tab} active={active} />
            </Link>
          ) : (
            <button key={tab.key} type="button" aria-haspopup="dialog" className={className} onClick={() => setOpenKey(tab.key)}>
              <TabBody tab={tab} active={active} />
            </button>
          );
        })}
      </div>
      <Sheet open={open !== undefined} onOpenChange={(o: boolean) => { if (!o) setOpenKey(null); }}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetTitle className="px-4 pt-4">{open?.label}</SheetTitle>
          <div className="grid max-h-[70dvh] grid-cols-2 gap-2 overflow-y-auto p-4 min-[360px]:grid-cols-3 sm:grid-cols-4">
            {(open?.items ?? []).map((item: NavItem) => {
              const Icon = item.icon;
              const current = under(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenKey(null)}
                  aria-current={current ? 'page' : undefined}
                  className={cn('flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-control p-2 text-center text-caption font-semibold', FOCUS_RING, current ? 'bg-muted text-foreground [&>svg]:text-primary' : 'text-muted-foreground hover:bg-muted')}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="w-full leading-tight text-balance">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
