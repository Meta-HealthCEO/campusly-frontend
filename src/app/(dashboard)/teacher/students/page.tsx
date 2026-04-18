'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, Search, GraduationCap } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { getStudentDisplayName, isPortalStudent } from '@/lib/student-helpers';
import { useTeacherStudents } from '@/hooks/useTeacherStudents';
import { ROUTES } from '@/lib/constants';

export default function TeacherStudentsPage() {
  const { students, loading } = useTeacherStudents();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const { full } = getStudentDisplayName(s);
      return (
        full.toLowerCase().includes(q) ||
        (s.admissionNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Students"
          description="View and manage students across all your classes"
        />
        <LoadingSpinner />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Students"
          description="View and manage students across all your classes"
        />
        <EmptyState
          icon={GraduationCap}
          title="No students yet"
          description="Add students to your classes to see them here"
          action={
            <Link
              href={ROUTES.TEACHER_CLASSES}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Classes
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="View and manage students across all your classes"
      />

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No students match &quot;{search}&quot;.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student) => {
            const { first, last, full } = getStudentDisplayName(student);
            const portal = isPortalStudent(student);
            const className =
              student.class?.name
                ? `${student.class.grade?.name ?? ''} ${student.class.name}`.trim()
                : '';

            return (
              <Card key={student.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(first, last)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{full}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.admissionNumber}
                      {className ? ` \u00B7 ${className}` : ''}
                    </p>
                  </div>
                  <Badge variant={portal ? 'default' : 'outline'}>
                    {portal ? 'Portal' : 'Roster only'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
