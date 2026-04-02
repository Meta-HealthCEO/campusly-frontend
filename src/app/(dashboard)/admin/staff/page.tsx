'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { staffSchema, type StaffFormData } from '@/lib/validations';
import { useStaff } from '@/hooks/useStaff';
import type { Teacher } from '@/types';

const columns: ColumnDef<Teacher>[] = [
  {
    accessorKey: 'employeeNumber',
    header: 'Employee No',
  },
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.user.firstName} ${row.user.lastName}`,
  },
  {
    accessorKey: 'department',
    header: 'Department',
  },
  {
    id: 'subjects',
    header: 'Subjects',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
        {row.original.subjects.map((subject) => (
          <Badge key={subject} variant="secondary">
            {subject}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.user.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive'
        }
      >
        {row.original.user.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function StaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { staffList, fetchStaff, createStaff } = useStaff();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onSubmit = async (data: StaffFormData) => {
    await createStaff(data);
    reset();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" description="Manage teachers and staff members">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </DialogTrigger>
          <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>Enter the details for the new staff member.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...register('firstName')} placeholder="First name" />
                    {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...register('lastName')} placeholder="Last name" />
                    {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="Email address" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} placeholder="Phone number" />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" {...register('department')} placeholder="Department" />
                  {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                  <Input id="subjects" {...register('subjects')} placeholder="e.g. Mathematics, Science" />
                  {errors.subjects && <p className="text-xs text-destructive">{errors.subjects.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Staff'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable columns={columns} data={staffList} searchKey="name" searchPlaceholder="Search staff..." />
    </div>
  );
}
