'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CareerClusterCard } from '@/components/careers/CareerClusterCard';
import { CareerCard } from '@/components/careers/CareerCard';
import { Input } from '@/components/ui/input';
import { useCareerExplorer } from '@/hooks/useCareerExplorer';
import { useAptitude } from '@/hooks/useAptitude';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';

const CAREER_CLUSTERS = [
  'STEM',
  'Health Sciences',
  'Business & Commerce',
  'Creative Arts',
  'Education',
  'Social Sciences',
  'Law & Government',
  'Agriculture & Environment',
  'Engineering',
] as const;

export default function CareerExplorerPage() {
  const router = useRouter();
  const { student, loading: studentLoading } = useCurrentStudent();
  const { result: aptitudeResult, fetchResults } = useAptitude();
  const { careers, loading: careersLoading, refetch } = useCareerExplorer();

  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch aptitude results once student is resolved
  useEffect(() => {
    if (student?.id) {
      fetchResults(student.id);
    }
  }, [student?.id, fetchResults]);

  // Refetch careers when cluster or search changes
  useEffect(() => {
    const filters: { cluster?: string; search?: string } = {};
    if (activeCluster) filters.cluster = activeCluster;
    if (search.trim()) filters.search = search.trim();
    refetch(filters);
  }, [activeCluster, search, refetch]);

  const handleClusterClick = useCallback((cluster: string) => {
    setActiveCluster((prev) => (prev === cluster ? null : cluster));
  }, []);

  const handleViewProgrammes = useCallback(
    (careerName: string) => {
      router.push(`/student/careers/explore?search=${encodeURIComponent(careerName)}`);
    },
    [router],
  );

  const getClusterScore = useCallback(
    (clusterName: string): number | undefined => {
      if (!aptitudeResult?.clusters) return undefined;
      const match = aptitudeResult.clusters.find(
        (c) => c.name.toLowerCase() === clusterName.toLowerCase(),
      );
      return match?.score;
    },
    [aptitudeResult],
  );

  if (studentLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Explorer"
        description="Browse careers by cluster, search by name, and discover programmes that match your interests."
      />

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search careers..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Cluster cards */}
      <section aria-label="Career clusters">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Browse by cluster
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {CAREER_CLUSTERS.map((cluster) => (
            <CareerClusterCard
              key={cluster}
              name={cluster}
              score={getClusterScore(cluster)}
              active={activeCluster === cluster}
              onClick={handleClusterClick}
            />
          ))}
        </div>
      </section>

      {/* Career results */}
      <section aria-label="Career results">
        {careersLoading ? (
          <LoadingSpinner />
        ) : careers.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No careers found"
            description={
              activeCluster || search
                ? 'Try adjusting your filters or search term.'
                : 'No career data is available yet.'
            }
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {careers.map((career) => (
              <CareerCard
                key={career.name}
                career={career}
                onViewProgrammes={handleViewProgrammes}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
