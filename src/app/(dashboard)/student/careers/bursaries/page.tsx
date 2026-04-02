'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useBursaries } from '@/hooks/useBursaries';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BursaryCard } from '@/components/careers/BursaryCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BursariesPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const {
    bursaries,
    matchedBursaries,
    totalPages,
    page,
    loading: bursariesLoading,
    refetch,
    fetchMatched,
  } = useBursaries();

  useEffect(() => {
    if (student?.id) {
      fetchMatched(student.id);
    }
  }, [student?.id, fetchMatched]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      refetch({ search: e.target.value, page: 1 });
    },
    [refetch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      refetch({ page: newPage });
    },
    [refetch],
  );

  const handleSave = useCallback((_id: string) => {
    toast.success('Bursary saved to your list');
  }, []);

  if (studentLoading || bursariesLoading) {
    return <LoadingSpinner className="mt-12" />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Student profile not found"
        description="We could not locate your student record. Please contact your school administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bursary Finder"
        description="Discover bursaries and scholarships you qualify for"
      />

      {/* Search bar */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search bursaries..."
          className="pl-9"
          onChange={handleSearchChange}
        />
      </div>

      {/* Matched bursaries section */}
      {matchedBursaries.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Matched Bursaries
              <Badge variant="secondary">{matchedBursaries.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Based on your APS and profile
            </p>
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {matchedBursaries.map((bursary) => (
              <BursaryCard
                key={bursary.id}
                bursary={bursary}
                matched
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      )}

      {/* All bursaries section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All Bursaries</h2>

        {bursaries.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No bursaries found"
            description="Try adjusting your search to see more results."
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {bursaries.map((bursary) => (
              <BursaryCard
                key={bursary.id}
                bursary={bursary}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
