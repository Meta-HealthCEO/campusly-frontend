'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useModule } from '@/hooks/useModule';
import { useAuthStore } from '@/stores/useAuthStore';
import { phoneNavLayout, phoneSectionLayout, visibleNavItems, type PhoneTab } from '@/lib/nav-visibility';
import type { NavItem } from '@/lib/constants';

interface BottomNavProps {
  items: NavItem[];
}

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const TAB_CLASS = 'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs transition-colors';

function SheetLinks({ items, pathname, onPick }: { items: NavItem[]; pathname: string; onPick: () => void }) {
  return (
    <div className="grid max-h-[70vh] grid-cols-3 gap-3 overflow-y-auto p-4 pb-6 sm:grid-cols-4">
      {items.map((item: NavItem) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onPick}
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
  );
}

/** Teacher phones: Today, Teach, Assess, Class and More tabs, each section opening its own sheet. */
function SectionTabs({ tabs, pathname }: { tabs: PhoneTab[]; pathname: string }) {
  const [openTab, setOpenTab] = useState<string | null>(null);
  const open = tabs.find((t: PhoneTab) => t.key === openTab);
  return (
    <>
      <div className="flex items-center justify-around">
        {tabs.map((tab: PhoneTab) => {
          const Icon = tab.icon;
          const active = tab.href ? pathname === tab.href : tab.items.some((i: NavItem) => isActivePath(pathname, i.href));
          const className = cn(TAB_CLASS, active ? 'text-primary' : 'text-muted-foreground');
          return tab.href ? (
            <Link key={tab.key} href={tab.href} className={className}>
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          ) : (
            <button key={tab.key} type="button" className={className} onClick={() => setOpenTab(tab.key)} aria-haspopup="dialog">
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <Sheet open={open !== undefined} onOpenChange={(o) => { if (!o) setOpenTab(null); }}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetTitle className="px-4 pt-4 font-heading text-base">{open?.label}</SheetTitle>
          <SheetLinks items={open?.items ?? []} pathname={pathname} onPick={() => setOpenTab(null)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Other portals: the first four items as tabs, everything else (including nested items) under More. */
function FlatTabs({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { primary, sheet } = phoneNavLayout(items);
  return (
    <div className="flex items-center justify-around">
      {primary.map((item: NavItem) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(TAB_CLASS, isActivePath(pathname, item.href) ? 'text-primary' : 'text-muted-foreground')}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      {sheet.length > 0 && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className={cn(TAB_CLASS, 'text-muted-foreground')}>
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent side="bottom" showCloseButton={false}>
            <SheetTitle className="sr-only">More navigation</SheetTitle>
            <SheetLinks items={sheet} pathname={pathname} onPick={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visible = visibleNavItems(items, { isModuleEnabled, hasPermission });
  const tabs = phoneSectionLayout(visible);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs ? <SectionTabs tabs={tabs} pathname={pathname} /> : <FlatTabs items={visible} pathname={pathname} />}
    </nav>
  );
}
