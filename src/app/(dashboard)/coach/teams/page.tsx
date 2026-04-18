'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { useTeams } from '@/hooks/useSport';
import { TeamsTab } from '@/components/sport/TeamsTab';

export default function CoachTeamsPage() {
  const { teams, loading, refetch, schoolId } = useTeams();

  return (
    <div className="space-y-6">
      <PageHeader title="Teams" description="Manage your teams and squads" />
      <TeamsTab teams={teams} loading={loading} schoolId={schoolId} onRefresh={refetch} />
    </div>
  );
}
