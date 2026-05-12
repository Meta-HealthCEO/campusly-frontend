'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHASE_1_NAV } from '@/lib/student-nav';

export function StudentBottomNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/student') return pathname === '/student';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t bg-background">
      {PHASE_1_NAV.map((i) => {
        const Icon = i.icon;
        const active = isActive(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={[
              'flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5',
              active ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
