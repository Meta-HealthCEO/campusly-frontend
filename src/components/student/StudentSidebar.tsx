'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHASE_1_NAV, PHASE_2_NAV, type StudentNavItem } from '@/lib/student-nav';
import { useStudentModules } from '@/hooks/useStudentModules';

function NavLink({ item, active }: { item: StudentNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function StudentSidebar() {
  const pathname = usePathname();
  const { enabled } = useStudentModules();
  const visiblePhase2 = PHASE_2_NAV.filter((i) => i.module && enabled.has(i.module));

  function isActive(href: string): boolean {
    if (href === '/student') return pathname === '/student';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="hidden lg:flex w-60 shrink-0 flex-col gap-1 border-r p-4">
      {PHASE_1_NAV.map((i) => (
        <NavLink key={i.href} item={i} active={isActive(i.href)} />
      ))}
      {visiblePhase2.length > 0 && (
        <>
          <div className="my-2 text-xs uppercase tracking-wide text-muted-foreground px-3">More</div>
          {visiblePhase2.map((i) => (
            <NavLink key={i.href} item={i} active={isActive(i.href)} />
          ))}
        </>
      )}
    </nav>
  );
}
