'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { Subject, SchoolClass } from '@/types';

/** Extended schema that includes totalMarks (required by backend) */
const homeworkFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  totalMarks: z.string().min(1, 'Total marks is required'),
});

type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

interface HomeworkFormProps {
  defaultValues?: Partial<HomeworkFormValues>;
  subjects: Subject[];
  classes: SchoolClass[];
  onSubmit: (data: HomeworkFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export type { HomeworkFormValues };

export function HomeworkForm({
  defaultValues,
  subjects,
  classes,
  onSubmit,
  onCancel,
  submitLabel = 'Create Homework',
}: HomeworkFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkFormSchema),
    // Validate after first blur, then live on every change — gives the user
    // inline feedback without yelling at them the moment the dialog opens.
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      subjectId: '',
      classId: '',
      dueDate: '',
      totalMarks: '',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Homework title" {...register('title')} />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
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
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select
            defaultValue={defaultValues?.subjectId}
            onValueChange={(val: unknown) => setValue('subjectId', val as string)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem
                  key={subject.id ?? (subject as unknown as { _id: string })._id}
                  value={subject.id ?? (subject as unknown as { _id: string })._id}
                >
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.subjectId && (
            <p className="text-xs text-destructive">{errors.subjectId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Class</Label>
          <Select
            defaultValue={defaultValues?.classId}
            onValueChange={(val: unknown) => setValue('classId', val as string)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem
                  key={cls.id ?? (cls as unknown as { _id: string })._id}
                  value={cls.id ?? (cls as unknown as { _id: string })._id}
                >
                  {cls.grade?.name ?? cls.gradeName ?? ''} {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.classId && (
            <p className="text-xs text-destructive">{errors.classId.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
          {errors.dueDate && (
            <p className="text-xs text-destructive">{errors.dueDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalMarks">Total Marks</Label>
          <Input
            id="totalMarks"
            type="number"
            min={1}
            placeholder="e.g. 50"
            {...register('totalMarks')}
          />
          {errors.totalMarks && (
            <p className="text-xs text-destructive">{errors.totalMarks.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
