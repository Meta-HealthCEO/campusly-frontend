'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResourceCard } from '@/components/content/ResourceCard';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentLearning } from '@/hooks/useStudentLearning';
import type { ContentResourceItem, StudentResourceFilters } from '@/types';
import Link from 'next/link';

export default function StudentLearnPage() {
  const router = useRouter();
  const { student, loading: studentLoading } = useCurrentStudent();
  const { resources, loading, fetchApprovedResources } = useStudentLearning();

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  const doFetch = useCallback(
    (filters?: StudentResourceFilters) => {
      fetchApprovedResources(filters).then(() => setHasFetched(true));
    },
    [fetchApprovedResources],
  );

  // Initial fetch once student resolves
  useEffect(() => {
    if (!studentLoading && student) {
      doFetch({ gradeId: student.gradeId });
    } else if (!studentLoading && !student) {
      doFetch();
    }
  }, [studentLoading, student, doFetch]);

  const handleSearch = () => {
    const filters: StudentResourceFilters = {};
    if (search.trim()) filters.search = search.trim();
    if (subjectFilter.trim()) filters.subjectId = subjectFilter.trim();
    if (student?.gradeId) filters.gradeId = student.gradeId;
    doFetch(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleResourceClick = (resource: ContentResourceItem) => {
    router.push(`/student/learn/${resource.id}`);
  };

  if (studentLoading || (!hasFetched && loading)) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Learn" description="Browse lessons and activities">
        <Link href="/student/learn/progress">
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="size-4" />
            My Progress
          </Button>
        </Link>
      </PageHeader>

      {/* Search & filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search topics, lessons..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 w-full"
          />
        </div>
        <Input
          placeholder="Filter by subject ID"
          value={subjectFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Button onClick={handleSearch} size="default">
          Search
        </Button>
      </div>

      {/* Resource grid */}
      {loading ? (
        <LoadingSpinner />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No resources found"
          description="Try adjusting your search or check back later for new content."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource: ContentResourceItem) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={handleResourceClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
