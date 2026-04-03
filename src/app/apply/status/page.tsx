'use client';

import { PublicStatusChecker } from '@/components/admissions/PublicStatusChecker';
import { useAdmissionsPublic } from '@/hooks/useAdmissionsPublic';
import { Search } from 'lucide-react';

export default function PublicStatusPage() {
  const { checkStatus, checking, error, statusResult } = useAdmissionsPublic();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Application Status</h1>
          <p className="text-muted-foreground">Check the status of your admissions application.</p>
        </div>

        <PublicStatusChecker
          onCheck={checkStatus}
          checking={checking}
          error={error}
          result={statusResult}
        />
      </div>
    </div>
  );
}
