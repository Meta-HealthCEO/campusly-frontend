'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { useTeams, useFixtures } from '@/hooks/useSport';
import { ResultsTab } from '@/components/sport/ResultsTab';

export default function CoachResultsPage() {
  const { teams, schoolId } = useTeams();
  const { fixtures, loading, refetch } = useFixtures();

  return (
    <div className="space-y-6">
      <PageHeader title="Results" description="Record and review match results" />
      <ResultsTab
        fixtures={fixtures}
        teams={teams}
        loading={loading}
        schoolId={schoolId}
        onRefresh={refetch}
      />
    </div>
  );
}
