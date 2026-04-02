'use client';

import { useEffect } from 'react';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConsentCompletionBar } from './ConsentCompletionBar';
import { PendingParentsTable } from './PendingParentsTable';
import {
  useConsentCompletionStats,
  useConsentPendingParents,
} from '@/hooks/useConsentStats';
import type { ApiConsentForm } from './types';

interface ConsentStatsPanelProps {
  form: ApiConsentForm;
  onBack: () => void;
}

export function ConsentStatsPanel({ form, onBack }: ConsentStatsPanelProps) {
  const {
    stats,
    loading: statsLoading,
    fetchStats,
  } = useConsentCompletionStats(form.id);

  const {
    pendingParents,
    loading: pendingLoading,
    fetchPendingParents,
  } = useConsentPendingParents(form.id);

  useEffect(() => {
    fetchStats();
    fetchPendingParents();
  }, [fetchStats, fetchPendingParents]);

  if (statsLoading || pendingLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{form.title}</h2>
          <p className="text-sm text-muted-foreground">
            Completion dashboard
          </p>
        </div>
      </div>

      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Completion Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConsentCompletionBar stats={stats} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Pending Responses ({pendingParents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PendingParentsTable parents={pendingParents} />
        </CardContent>
      </Card>
    </div>
  );
}
