'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { useSeasons, useTeams } from '@/hooks/useSport';
import { SeasonsTab } from '@/components/sport/SeasonsTab';

export default function CoachSeasonsPage() {
  const { schoolId } = useTeams();
  const { seasons, loading, refetch } = useSeasons();

  return (
    <div className="space-y-6">
      <PageHeader title="Seasons" description="Competition seasons and league standings" />
      <SeasonsTab seasons={seasons} loading={loading} schoolId={schoolId} onRefresh={refetch} />
    </div>
  );
}
