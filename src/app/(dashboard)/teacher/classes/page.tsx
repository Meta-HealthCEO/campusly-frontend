'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClassroomCodeCard } from '@/components/shared/ClassroomCodeCard';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, BookOpen, Search } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { resolveField } from '@/lib/api-helpers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { Student } from '@/types';

function getStudentName(student: Student): { first: string; last: string } {
  const userObj = student.user ?? student.userId;
  const first =
    resolveField<string>(userObj, 'firstName')
    ?? resolveField<string>(student, 'firstName')
    ?? '';
  const last =
    resolveField<string>(userObj, 'lastName')
    ?? resolveField<string>(student, 'lastName')
    ?? '';
  return { first, last };
}

export default function TeacherClassesPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const { classes, students, loading } = useTeacherClasses();

  const selectedClass = selectedClassId
    ? classes.find((c) => c.id === selectedClassId)
    : null;

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [] as Student[];
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter((s) => {
      const { first, last } = getStudentName(s);
      const full = `${first} ${last}`.toLowerCase();
      return (
        full.includes(q)
        || (s.admissionNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [classStudents, studentSearch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Classes"
          description="View your assigned classes and student lists"
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        description="View your assigned classes and student lists"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => {
          const studentCount = students.filter((s) => s.classId === cls.id).length;
          const capacity = cls.capacity ?? 30;
          const capacityPercentage = Math.round((studentCount / capacity) * 100);

          return (
            <Card
              key={cls.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setSelectedClassId(cls.id)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      {cls.grade?.name ?? (cls as unknown as Record<string, unknown>).gradeName as string ?? ''} {cls.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {cls.grade?.name ?? (cls as unknown as Record<string, unknown>).gradeName as string ?? ''}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">{studentCount} / {capacity}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        capacityPercentage > 90
                          ? 'bg-destructive'
                          : capacityPercentage > 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <Badge variant="secondary">{capacityPercentage}% capacity</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {classes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Classes Assigned</h3>
            <p className="text-sm text-muted-foreground">
              You do not have any classes assigned to you yet.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedClassId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClassId(null);
            setStudentSearch('');
          }
        }}
      >
        <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedClass
                ? `${selectedClass.grade?.name ?? ''} ${selectedClass.name} - Student List`
                : 'Student List'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {selectedClassId && selectedClass && (
              <ClassroomCodeCard
                classId={selectedClassId}
                className={`${selectedClass.grade?.name ?? ''} ${selectedClass.name}`.trim()}
              />
            )}

            {classStudents.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="pl-9"
                />
              </div>
            )}

            <div className="space-y-2">
              {classStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No students in this class.
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No students match &quot;{studentSearch}&quot;.
                </p>
              ) : (
                filteredStudents.map((student, index) => {
                  const { first, last } = getStudentName(student);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(first, last)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {first} {last}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.admissionNumber}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
