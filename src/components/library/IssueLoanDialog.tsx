'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { LibraryBookRecord } from '@/hooks/useLibrary';
import type { Student } from '@/types';

interface IssueLoanFormData {
  bookId: string;
  studentId: string;
  dueDate: string;
}

interface IssueLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: LibraryBookRecord[];
  students: Student[];
  onSubmit: (data: IssueLoanFormData) => Promise<void>;
}

export function IssueLoanDialog({ open, onOpenChange, books, students, onSubmit }: IssueLoanDialogProps) {
  const {
    register, handleSubmit, setValue, reset, formState: { errors, isSubmitting },
  } = useForm<IssueLoanFormData>();

  const availableBooks = books.filter((b) => b.availableCopies > 0);

  const handleFormSubmit = async (data: IssueLoanFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
          <DialogDescription>Issue a book to a student. Only books with available copies are shown.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Book *</Label>
            <Select onValueChange={(val: unknown) => setValue('bookId', val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                {availableBooks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} ({b.availableCopies} avail.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('bookId', { required: 'Book is required' })} />
            {errors.bookId && <p className="text-xs text-destructive">{errors.bookId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select onValueChange={(val: unknown) => setValue('studentId', val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => {
                  const name = s.user
                    ? `${s.user.firstName} ${s.user.lastName}`
                    : `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.admissionNumber;
                  return (
                    <SelectItem key={s.id ?? s._id} value={s.id ?? s._id ?? ''}>
                      {name} ({s.admissionNumber})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('studentId', { required: 'Student is required' })} />
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input id="dueDate" type="date" {...register('dueDate', { required: 'Due date is required' })} />
            {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : 'Issue Book'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
