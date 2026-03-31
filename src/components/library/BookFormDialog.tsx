'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { LibraryBookRecord } from '@/hooks/useLibrary';

interface BookFormData {
  title: string;
  author: string;
  category: string;
  copies: number;
  availableCopies: number;
  isbn: string;
  shelfLocation: string;
  coverImageUrl: string;
}

interface BookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: LibraryBookRecord | null;
  onSubmit: (data: BookFormData) => Promise<void>;
}

export function BookFormDialog({ open, onOpenChange, book, onSubmit }: BookFormDialogProps) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<BookFormData>({
    defaultValues: {
      title: '', author: '', category: '', copies: 1,
      availableCopies: 1, isbn: '', shelfLocation: '', coverImageUrl: '',
    },
  });

  useEffect(() => {
    if (book) {
      reset({
        title: book.title, author: book.author, category: book.category,
        copies: book.copies, availableCopies: book.availableCopies,
        isbn: book.isbn ?? '', shelfLocation: book.shelfLocation ?? '',
        coverImageUrl: book.coverImageUrl ?? '',
      });
    } else {
      reset({
        title: '', author: '', category: '', copies: 1,
        availableCopies: 1, isbn: '', shelfLocation: '', coverImageUrl: '',
      });
    }
  }, [book, open, reset]);

  const handleFormSubmit = async (data: BookFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{book ? 'Edit Book' : 'Add Book'}</DialogTitle>
          <DialogDescription>
            {book ? 'Update the book details.' : 'Add a new book to the library catalogue.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author *</Label>
            <Input id="author" {...register('author', { required: 'Author is required' })} />
            {errors.author && <p className="text-xs text-destructive">{errors.author.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input id="category" {...register('category', { required: 'Category is required' })} />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="copies">Total Copies *</Label>
              <Input
                id="copies" type="number"
                {...register('copies', { required: 'Required', valueAsNumber: true, min: { value: 0, message: 'Min 0' } })}
              />
              {errors.copies && <p className="text-xs text-destructive">{errors.copies.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableCopies">Available *</Label>
              <Input
                id="availableCopies" type="number"
                {...register('availableCopies', { required: 'Required', valueAsNumber: true, min: { value: 0, message: 'Min 0' } })}
              />
              {errors.availableCopies && <p className="text-xs text-destructive">{errors.availableCopies.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input id="isbn" {...register('isbn')} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shelfLocation">Shelf Location</Label>
            <Input id="shelfLocation" {...register('shelfLocation')} placeholder="e.g. Section A, Shelf 2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <Input id="coverImageUrl" {...register('coverImageUrl')} placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : book ? 'Update Book' : 'Add Book'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
