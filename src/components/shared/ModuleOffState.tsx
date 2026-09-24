'use client';

import Link from 'next/link';
import { PowerOff } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface ModuleOffStateProps {
  label: string;
}

/** Shown instead of a page whose module the school hasn't switched on. */
export function ModuleOffState({ label }: ModuleOffStateProps) {
  return (
    <EmptyState
      icon={PowerOff}
      title={`${label} isn't switched on for your school`}
      description="Ask your school admin to turn it on. Everything else in Campusly works as normal."
      action={<Link href={ROUTES.TEACHER_DASHBOARD} className={cn(buttonVariants())}>Back to Today</Link>}
    />
  );
}
