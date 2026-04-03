'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TextbookCard } from '@/components/textbook';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import type { TextbookItem, TextbookFilters } from '@/types';

export default function StudentTextbooksPage() {
  const router = useRouter();
  const { student, loading: studentLoading } = useCurrentStudent();
  const { textbooks, loading, fetchTextbooks } = useTextbooks();
  const { grades } = useGrades();
  const { subjects } = useSubjects();

  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const applyFilters = useCallback(() => {
    const filters: TextbookFilters = { status: 'published' };
    if (filterSubject) filters.subjectId = filterSubject;
    if (filterGrade) filters.gradeId = filterGrade;
    if (search) filters.search = search;
    fetchTextbooks(filters);
  }, [fetchTextbooks, filterSubject, filterGrade, search]);

  useEffect(() => {
    if (!studentLoading) applyFilters();
  }, [applyFilters, studentLoading]);

  const handleClick = useCallback(
    (textbook: TextbookItem) => {
      router.push(`/student/learn/textbooks/${textbook.id}`);
    },
    [router],
  );

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );
  const gradeOptions = useMemo(
    () => grades.map((g) => ({ id: g.id, name: g.name })),
    [grades],
  );

  if (studentLoading || (loading && textbooks.length === 0)) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Textbooks" description="Browse available digital textbooks" />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search textbooks..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select
          value={filterSubject || undefined}
          onValueChange={(v: unknown) => setFilterSubject((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterGrade || undefined}
          onValueChange={(v: unknown) => setFilterGrade((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {textbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No textbooks available"
          description="No published textbooks match your filters."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {textbooks.map((tb: TextbookItem) => (
            <TextbookCard key={tb.id} textbook={tb} onClick={handleClick} />
          ))}
        </div>
      )}
    </div>
  );
}
