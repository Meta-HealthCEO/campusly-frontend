'use client';

import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { JobListTable } from '@/components/paper-import/JobListTable';
import { cn } from '@/lib/utils';

export default function ImportJobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/curriculum/import"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader title="My Imports" description="All your paper-to-digital conversions." />
        </div>
        <Link
          href="/teacher/curriculum/import"
          className={cn(buttonVariants({ variant: 'default' }))}
        >
          <Plus className="mr-1 h-4 w-4" /> New import
        </Link>
      </div>
      <JobListTable />
    </div>
  );
}
