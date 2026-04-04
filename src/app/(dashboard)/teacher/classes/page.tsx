'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClassroomCodeCard } from '@/components/shared/ClassroomCodeCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, BookOpen } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';

export default function TeacherClassesPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { classes, students } = useTeacherClasses();

  const selectedClass = selectedClassId
    ? classes.find((c) => c.id === selectedClassId)
    : null;
  const classStudents = selectedClassId
    ? students.filter((s) => s.classId === selectedClassId)
    : [];

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
        onOpenChange={(open) => { if (!open) setSelectedClassId(null); }}
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
          <div className="space-y-2">
            {classStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No students in this class.</p>
            ) : (
              classStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(
                      student.user?.firstName ?? (student.userId as unknown as Record<string, unknown>)?.firstName as string ?? (student as unknown as Record<string, unknown>).firstName as string ?? '',
                      student.user?.lastName ?? (student.userId as unknown as Record<string, unknown>)?.lastName as string ?? (student as unknown as Record<string, unknown>).lastName as string ?? ''
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {student.user?.firstName ?? (student.userId as unknown as Record<string, unknown>)?.firstName as string ?? (student as unknown as Record<string, unknown>).firstName as string} {student.user?.lastName ?? (student.userId as unknown as Record<string, unknown>)?.lastName as string ?? (student as unknown as Record<string, unknown>).lastName as string}
                    </p>
                    <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </div>
              ))
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
