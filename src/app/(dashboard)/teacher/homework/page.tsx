'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, BookOpen, Users, Calendar, FileText, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { HomeworkForm } from '@/components/homework/HomeworkForm';
import type { HomeworkFormValues } from '@/components/homework/HomeworkForm';
import { useTeacherHomework } from '@/hooks/useTeacherHomework';
import Link from 'next/link';

export default function TeacherHomeworkPage() {
  const [open, setOpen] = useState(false);
  const {
    teacherHomework,
    subjects,
    classOptions,
    submissionCounts,
    deleting,
    createHomework,
    deleteHomework,
  } = useTeacherHomework();

  const onSubmit = async (data: HomeworkFormValues) => {
    const success = await createHomework(data);
    if (success) setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Create and manage homework assignments">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Homework
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Create New Homework</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <HomeworkForm
                subjects={subjects}
                classes={classOptions}
                onSubmit={onSubmit}
                onCancel={() => setOpen(false)}
                submitLabel="Create Homework"
              />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {teacherHomework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Homework Created</h3>
            <p className="text-sm text-muted-foreground">
              Create your first homework assignment to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teacherHomework.map((hw) => {
            const counts = submissionCounts[hw.id] ?? { total: 0, graded: 0 };
            const displayStatus = hw.status === 'published' ? 'assigned' : hw.status;

            return (
              <Link key={hw.id} href={`/teacher/homework/${hw.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{hw.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {hw.subject?.name ?? hw.subjectName ?? ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {counts.total} submissions
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Due {formatDate(hw.dueDate)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            displayStatus === 'assigned'
                              ? 'default'
                              : displayStatus === 'closed'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {displayStatus}
                        </Badge>
                        {counts.total > 0 && (
                          <Badge variant="outline">
                            {counts.graded}/{counts.total} graded
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => deleteHomework(hw.id, e)}
                          disabled={deleting === hw.id}
                          aria-label="Delete homework"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
