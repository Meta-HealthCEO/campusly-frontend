'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Plus, BookOpen, Users, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Homework, Subject, SchoolClass } from '@/types';
import { formatDate } from '@/lib/utils';
import { homeworkSchema, type HomeworkFormData } from '@/lib/validations';
import apiClient from '@/lib/api-client';
import Link from 'next/link';

export default function TeacherHomeworkPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classOptions, setClassOptions] = useState<SchoolClass[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<HomeworkFormData>({
    resolver: zodResolver(homeworkSchema),
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [hwRes, subjectsRes, classesRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          apiClient.get('/academic/subjects'),
          apiClient.get('/academic/classes'),
        ]);
        if (hwRes.status === 'fulfilled' && hwRes.value.data) {
          const data = hwRes.value.data.data ?? hwRes.value.data;
          if (Array.isArray(data)) setHomeworkList(data);
        }
        if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data) {
          const d = subjectsRes.value.data.data ?? subjectsRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          if (arr.length > 0) setSubjects(arr);
        }
        if (classesRes.status === 'fulfilled' && classesRes.value.data) {
          const d = classesRes.value.data.data ?? classesRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          if (arr.length > 0) setClassOptions(arr);
        }
      } catch {
        console.error('Failed to load homework data');
      }
    }
    fetchData();
  }, []);

  const onSubmit = async (data: HomeworkFormData) => {
    try {
      const response = await apiClient.post('/homework', data);
      const newHw = response.data.data ?? response.data;
      setHomeworkList((prev) => [newHw, ...prev]);
    } catch {
      toast.error('Failed to create homework');
    }
    setOpen(false);
    reset();
  };

  const teacherHomework = homeworkList.filter(
    (hw) => hw.teacherId === user?.id
  );

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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Homework</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Homework title"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the homework..."
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue('subjectId', val as string)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subjectId && (
                    <p className="text-xs text-destructive">
                      {errors.subjectId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue('classId', val as string)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.grade?.name ?? cls.gradeName ?? ''} {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.classId && (
                    <p className="text-xs text-destructive">
                      {errors.classId.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register('dueDate')}
                />
                {errors.dueDate && (
                  <p className="text-xs text-destructive">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Homework</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Homework List */}
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
            const submissionCount = 0; // TODO: fetch from API
            const gradedCount = 0;

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
                            {submissionCount} submissions
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Due {formatDate(hw.dueDate)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            hw.status === 'published'
                              ? 'default'
                              : hw.status === 'closed'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {hw.status}
                        </Badge>
                        {submissionCount > 0 && (
                          <Badge variant="outline">
                            {gradedCount}/{submissionCount} graded
                          </Badge>
                        )}
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
