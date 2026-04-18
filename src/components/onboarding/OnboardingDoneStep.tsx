'use client';

import { CheckCircle, ClipboardCheck, BookOpen, Compass } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const QUICK_LINKS = [
  { href: '/teacher/attendance', icon: ClipboardCheck, label: 'Take attendance' },
  { href: '/teacher/homework', icon: BookOpen, label: 'Assign homework' },
  { href: '/teacher/curriculum', icon: Compass, label: 'Explore curriculum' },
] as const;

interface OnboardingDoneStepProps {
  onFinish: () => void;
}

export function OnboardingDoneStep({ onFinish }: OnboardingDoneStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your classroom is ready. Here are some things you can do next.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {QUICK_LINKS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <Button onClick={onFinish} className="min-w-[180px]">
        Go to dashboard
      </Button>
    </div>
  );
}
