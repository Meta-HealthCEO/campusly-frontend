'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ListSkeleton } from '@/components/shared/skeletons';
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
import { TemplateSelector } from '@/components/homework/TemplateSelector';
import { SaveAsTemplateButton } from '@/components/homework/SaveAsTemplateButton';
import type { HomeworkFormValues } from '@/components/homework/HomeworkForm';
import type { HomeworkTemplate } from '@/types';
import { useTeacherHomework } from '@/hooks/useTeacherHomework';
import { useHomeworkTemplates } from '@/hooks/useHomeworkTemplates';
import Link from 'next/link';

export default function TeacherHomeworkPage() {
  const [open, setOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<Partial<HomeworkFormValues> | undefined>();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const {
    teacherHomework,
    subjects,
    classOptions,
    submissionCounts,
    deleting,
    loading,
    createHomework,
    deleteHomework,
  } = useTeacherHomework();
  const {
    templates,
    deleteTemplate,
    saveAsTemplate,
  } = useHomeworkTemplates();

  const onSubmit = async (data: HomeworkFormValues) => {
    const success = await createHomework(data);
    if (success) {
      setOpen(false);
      setFormDefaults(undefined);
    }
  };

  const onSelectTemplate = (template: HomeworkTemplate) => {
    setFormDefaults({
      title: template.title,
      description: template.description ?? '',
      subjectId: template.subjectId,
      totalMarks: String(template.totalMarks),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Create and manage homework assignments">
        <div className="flex items-center gap-2">
          <TemplateSelector
            templates={templates}
            onSelect={onSelectTemplate}
            onDelete={deleteTemplate}
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormDefaults(undefined); }}>
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
                  key={formDefaults?.title ?? 'empty'}
                  defaultValues={formDefaults}
                  subjects={subjects}
                  classes={classOptions}
                  onSubmit={onSubmit}
                  onCancel={() => { setOpen(false); setFormDefaults(undefined); }}
                  submitLabel="Create Homework"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : teacherHomework.length === 0 ? (
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
            const counts = submissionCounts[hw._id] ?? { total: 0, graded: 0 };
            const displayStatus = hw.status;

            return (
              <Link key={hw._id} href={`/teacher/homework/${hw._id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{hw.title}</h3>
                            <Badge variant="secondary" className="shrink-0 capitalize">
                              {hw.type}
                            </Badge>
                          </div>
                          {/* TODO: lookup subject name via useSubjects(hw.subjectId) */}
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
                              : 'secondary'
                          }
                        >
                          {displayStatus}
                        </Badge>
                        {counts.total > 0 && (
                          <Badge variant="outline">
                            {counts.graded}/{counts.total} graded
                          </Badge>
                        )}
                        <SaveAsTemplateButton
                          onSave={() => saveAsTemplate(hw._id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDelete({ id: hw._id, title: hw.title });
                          }}
                          disabled={deleting === hw._id}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title="Delete homework"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.title}"? All submissions and grades will also be removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingDelete) await deleteHomework(pendingDelete.id);
        }}
      />
    </div>
  );
}
