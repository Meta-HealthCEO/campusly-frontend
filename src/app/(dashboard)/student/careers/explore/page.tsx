'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useProgrammeMatcher } from '@/hooks/useProgrammeMatcher';
import type { MatchFilters } from '@/hooks/useProgrammeMatcher';
import { useUniversities } from '@/hooks/useUniversities';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ProgrammeFilter } from '@/components/careers/ProgrammeFilter';
import type { ProgrammeFilterValues } from '@/components/careers/ProgrammeFilter';
import { MatchSummaryStats } from '@/components/careers/MatchSummaryStats';
import { ProgrammeCard } from '@/components/careers/ProgrammeCard';
import { Button } from '@/components/ui/button';

function mapFiltersToMatchParams(filters: ProgrammeFilterValues): MatchFilters {
  const params: MatchFilters = {};

  // Combine search (programme name) and field (field of study) into the API's `field` param
  const keywords = [filters.search, filters.field].filter(Boolean).join(' ');
  if (keywords) params.field = keywords;
  if (filters.universityId) params.universityId = filters.universityId;
  if (filters.matchStatus === 'eligible' || filters.matchStatus === 'close') {
    params.status = filters.matchStatus;
  }

  return params;
}

export default function ExploreProgrammesPage() {
  const router = useRouter();
  const { student, loading: studentLoading } = useCurrentStudent();
  const { universities, loading: uniLoading } = useUniversities({ limit: 100 });
  const {
    matchResult,
    loading: matchLoading,
    refetch,
  } = useProgrammeMatcher(student?.id ?? '');

  const [currentFilters, setCurrentFilters] = useState<MatchFilters>({});

  const handleFilterChange = useCallback(
    (values: ProgrammeFilterValues) => {
      const mapped = mapFiltersToMatchParams(values);
      setCurrentFilters(mapped);
      refetch({ ...mapped, page: 1 });
    },
    [refetch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      refetch({ ...currentFilters, page: newPage });
    },
    [refetch, currentFilters],
  );

  const handleSave = useCallback((_programmeId: string) => {
    toast.success('Programme saved');
  }, []);

  const handleApply = useCallback(
    (_programmeId: string) => {
      router.push('/student/careers/applications');
    },
    [router],
  );

  const isLoading = studentLoading || uniLoading || matchLoading;

  if (isLoading) {
    return <LoadingSpinner className="mt-12" />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Student profile not found"
        description="We could not locate your student record. Please contact your school administrator."
      />
    );
  }

  const universityOptions = universities.map((u) => ({ id: u.id, name: u.name }));
  const matches = matchResult?.matches ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore Programmes"
        description="Find university programmes that match your profile"
      />

      {matchResult && (
        <MatchSummaryStats
          summary={matchResult.summary}
          studentAPS={matchResult.studentAPS}
        />
      )}

      <ProgrammeFilter
        onFilterChange={handleFilterChange}
        universities={universityOptions}
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No programmes match your filters"
          description="Try adjusting your search criteria or clearing filters to see more results."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {matches.map((match) => (
            <ProgrammeCard
              key={match.programmeId}
              match={match}
              onSave={handleSave}
              onApply={handleApply}
            />
          ))}
        </div>
      )}

      {matchResult && matchResult.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={matchResult.page <= 1}
            onClick={() => handlePageChange(matchResult.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {matchResult.page} of {matchResult.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={matchResult.page >= matchResult.totalPages}
            onClick={() => handlePageChange(matchResult.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
