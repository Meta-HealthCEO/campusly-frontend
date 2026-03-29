'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
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
import { Plus, Shield } from 'lucide-react';
import { mockDisciplineRecords, mockStudents } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { disciplineSchema, type DisciplineFormData } from '@/lib/validations';
import type { DisciplineRecord } from '@/types';

const columns: ColumnDef<DisciplineRecord>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'student',
    header: 'Student',
    cell: ({ row }) =>
      `${row.original.student.user.firstName} ${row.original.student.user.lastName}`,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge
        variant={row.original.type === 'merit' ? 'default' : 'destructive'}
        className={
          row.original.type === 'merit'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
            : ''
        }
      >
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'points',
    header: 'Points',
    cell: ({ row }) => (
      <span
        className={`font-semibold ${
          row.original.type === 'merit'
            ? 'text-emerald-600'
            : 'text-red-600'
        }`}
      >
        {row.original.type === 'merit' ? '+' : '-'}
        {row.original.points}
      </span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.original.description}</span>
    ),
  },
];

export default function TeacherDisciplinePage() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<DisciplineFormData>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: {
      type: 'merit',
      points: 5,
    },
  });

  const onSubmit = (data: DisciplineFormData) => {
    console.log('New discipline record:', data);
    setOpen(false);
    reset();
  };

  const selectedType = watch('type');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline Records"
        description="Track merits and demerits for students"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Incident
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Discipline Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select
                  onValueChange={(val) =>
                    setValue('studentId', val as string)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.user.firstName} {student.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.studentId && (
                  <p className="text-xs text-destructive">
                    {errors.studentId.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(val) =>
                      setValue('type', val as 'merit' | 'demerit')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merit">Merit</SelectItem>
                      <SelectItem value="demerit">Demerit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    {...register('points', { valueAsNumber: true })}
                  />
                  {errors.points && (
                    <p className="text-xs text-destructive">
                      {errors.points.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Academic Excellence, Late Arrival"
                  {...register('category')}
                />
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the incident..."
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
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
                <Button type="submit">Save Record</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={columns}
        data={mockDisciplineRecords}
        searchKey="category"
        searchPlaceholder="Search by category..."
      />
    </div>
  );
}
