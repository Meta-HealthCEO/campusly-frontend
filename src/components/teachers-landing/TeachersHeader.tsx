import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { StartFreeLink } from './StartFreeLink';

const NAV = [
  { label: 'How it works', href: '#evening' },
  { label: 'Pricing', href: '#plans' },
  { label: 'For schools', href: '/' },
];

export function TeachersHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-(--ink)/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/teachers" className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lavender)">
          <GraduationCap className="size-6 text-(--lavender)" aria-hidden />
          Campusly
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lavender)">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden rounded-sm text-sm text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lavender) sm:inline">
            Sign in
          </Link>
          <StartFreeLink size="sm" />
        </div>
      </div>
    </header>
  );
}
