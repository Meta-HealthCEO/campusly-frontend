'use client';

import { GraduationCap, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockGrades, mockClasses, mockSubjects } from '@/lib/mock-data';
import type { Subject } from '@/types';

const subjectColumns: ColumnDef<Subject>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
  },
  {
    accessorKey: 'name',
    header: 'Subject Name',
  },
  {
    id: 'teacher',
    header: 'Teacher',
    accessorFn: (row) => `${row.teacher.user.firstName} ${row.teacher.user.lastName}`,
  },
  {
    id: 'elective',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={row.original.isElective ? 'secondary' : 'default'}>
        {row.original.isElective ? 'Elective' : 'Compulsory'}
      </Badge>
    ),
  },
];

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Academics" description="Manage grades, classes, and subjects" />

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">
            <GraduationCap className="mr-1 h-4 w-4" />
            Grades & Classes
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="mr-1 h-4 w-4" />
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4 space-y-4">
          {mockGrades.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No grades" description="No grades have been set up yet." />
          ) : (
            mockGrades.map((grade) => {
              const gradeClasses = mockClasses.filter((c) => c.gradeId === grade.id);
              return (
                <Card key={grade.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{grade.name}</span>
                      <Badge variant="secondary">Level {grade.level}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gradeClasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes assigned to this grade.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {gradeClasses.map((cls) => (
                          <div key={cls.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Class {cls.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {cls.studentCount}/{cls.capacity}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {cls.studentCount} students enrolled
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="subjects" className="mt-4">
          <DataTable columns={subjectColumns} data={mockSubjects} searchKey="name" searchPlaceholder="Search subjects..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
