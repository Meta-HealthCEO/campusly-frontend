'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { useTeams, useFixtures } from '@/hooks/useSport';
import { FixturesTab } from '@/components/sport/FixturesTab';

export default function CoachFixturesPage() {
  const { teams, schoolId } = useTeams();
  const { fixtures, loading, refetch } = useFixtures();

  return (
    <div className="space-y-6">
      <PageHeader title="Fixtures" description="Schedule and track upcoming matches" />
      <FixturesTab
        fixtures={fixtures}
        teams={teams}
        loading={loading}
        schoolId={schoolId}
        onRefresh={refetch}
      />
    </div>
  );
}
