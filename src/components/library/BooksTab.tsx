'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { BookFormDialog } from './BookFormDialog';
import type { LibraryBookRecord } from '@/hooks/useLibrary';

interface BooksTabProps {
  books: LibraryBookRecord[];
  loading: boolean;
  onCreateBook: (data: {
    title: string; author: string; category: string;
    copies: number; availableCopies: number;
    isbn?: string; shelfLocation?: string; coverImageUrl?: string;
  }) => Promise<LibraryBookRecord>;
  onUpdateBook: (bookId: string, data: Record<string, unknown>) => Promise<LibraryBookRecord>;
  onDeleteBook: (bookId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  search: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
}

export function BooksTab({
  books, loading, onCreateBook, onUpdateBook, onDeleteBook,
  onRefresh, search, onSearchChange, categoryFilter, onCategoryChange,
}: BooksTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBook, setEditBook] = useState<LibraryBookRecord | null>(null);

  const categories = Array.from(new Set(books.map((b) => b.category).filter(Boolean)));

  const handleSubmit = async (data: {
    title: string; author: string; category: string;
    copies: number; availableCopies: number;
    isbn: string; shelfLocation: string; coverImageUrl: string;
  }) => {
    try {
      if (editBook) {
        await onUpdateBook(editBook.id, data);
      } else {
        await onCreateBook(data);
      }
      setEditBook(null);
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (editBook ? 'Failed to update book' : 'Failed to add book');
      toast.error(msg);
    }
  };

  const handleDelete = async (book: LibraryBookRecord) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await onDeleteBook(book.id);
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete book';
      toast.error(msg);
    }
  };

  const columns: ColumnDef<LibraryBookRecord, unknown>[] = [
    {
      accessorKey: 'title', header: 'Title',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.author}</p>
        </div>
      ),
    },
    { accessorKey: 'isbn', header: 'ISBN', cell: ({ row }) => row.original.isbn || '-' },
    {
      accessorKey: 'category', header: 'Category',
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    { accessorKey: 'copies', header: 'Total Copies' },
    {
      accessorKey: 'availableCopies', header: 'Available',
      cell: ({ row }) => (
        <Badge variant={row.original.availableCopies > 0 ? 'default' : 'destructive'}>
          {row.original.availableCopies > 0 ? `${row.original.availableCopies} available` : 'All out'}
        </Badge>
      ),
    },
    {
      accessorKey: 'shelfLocation', header: 'Location',
      cell: ({ row }) => row.original.shelfLocation || '-',
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => { setEditBook(row.original); setDialogOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, author, ISBN..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(val: unknown) => onCategoryChange(val === 'all' ? '' : val as string)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditBook(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Book
        </Button>
      </div>

      <DataTable columns={columns} data={books} searchKey="title" />

      <BookFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditBook(null); }}
        book={editBook}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
