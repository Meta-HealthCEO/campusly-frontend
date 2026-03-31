'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  BookOpen, BookMarked, AlertTriangle, Library, Clock, CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentLibrary } from '@/hooks/useParentLibrary';
import type { BookBorrowing } from '@/types';

const statusStyles: Record<string, string> = {
  borrowed: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
  returned: 'bg-emerald-100 text-emerald-800',
};

const borrowingColumns: ColumnDef<BookBorrowing, unknown>[] = [
  {
    accessorKey: 'book.title', header: 'Title',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.book?.title ?? '-'}</p>
        <p className="text-xs text-muted-foreground">by {row.original.book?.author ?? '-'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'book.category', header: 'Category',
    cell: ({ row }) => <Badge variant="outline">{row.original.book?.category ?? '-'}</Badge>,
  },
  { accessorKey: 'borrowedDate', header: 'Borrowed', cell: ({ row }) => formatDate(row.original.borrowedDate) },
  {
    accessorKey: 'dueDate', header: 'Due Date',
    cell: ({ row }) => (
      <span className={row.original.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
        {formatDate(row.original.dueDate)}
      </span>
    ),
  },
  { accessorKey: 'returnedDate', header: 'Returned', cell: ({ row }) => row.original.returnedDate ? formatDate(row.original.returnedDate) : '-' },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
];

export default function LibraryPage() {
  const { children } = useCurrentParent();
  const { childBorrowings, loading } = useParentLibrary();

  const totalBorrowed = childBorrowings.reduce((s, cb) => s + cb.currentlyBorrowed.length, 0);
  const totalOverdue = childBorrowings.reduce((s, cb) => s + cb.overdue.length, 0);
  const totalReturned = childBorrowings.reduce((s, cb) => s + cb.returned.length, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description="Track your children's library borrowings and reading history." />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Currently Borrowed" value={String(totalBorrowed)} icon={BookMarked} description="Books checked out" />
        <StatCard title="Overdue Books" value={String(totalOverdue)} icon={AlertTriangle} description={totalOverdue > 0 ? 'Return required' : 'No overdue books'} />
        <StatCard title="Books Returned" value={String(totalReturned)} icon={CheckCircle2} description="This term" />
      </div>

      {totalOverdue > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-2.5"><AlertTriangle className="h-5 w-5 text-red-700" /></div>
              <div>
                <p className="font-medium text-red-800">Overdue Books Alert</p>
                <p className="text-sm text-red-700">
                  There {totalOverdue === 1 ? 'is' : 'are'} {totalOverdue} overdue book{totalOverdue !== 1 ? 's' : ''} that need{totalOverdue === 1 ? 's' : ''} to be returned immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={children[0]?.id ?? ''}>
        <TabsList>
          {childBorrowings.map((cb) => (
            <TabsTrigger key={cb.childId} value={cb.childId}>{cb.firstName} {cb.lastName}</TabsTrigger>
          ))}
        </TabsList>

        {childBorrowings.map((cb) => (
          <TabsContent key={cb.childId} value={cb.childId} className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-3">Currently Borrowed</h3>
              {cb.currentlyBorrowed.length > 0 || cb.overdue.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...cb.overdue, ...cb.currentlyBorrowed].map((borrowing) => (
                    <Card key={borrowing.id} className={borrowing.status === 'overdue' ? 'border-red-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <BookOpen className={`h-8 w-8 ${borrowing.status === 'overdue' ? 'text-red-500' : 'text-primary'}`} />
                          <Badge variant="secondary" className={statusStyles[borrowing.status] ?? ''}>
                            {borrowing.status.charAt(0).toUpperCase() + borrowing.status.slice(1)}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{borrowing.book?.title ?? '-'}</h4>
                        <p className="text-xs text-muted-foreground mb-3">by {borrowing.book?.author ?? '-'}</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Library className="h-3 w-3" /><span>{borrowing.book?.category ?? '-'}</span></div>
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>Borrowed: {formatDate(borrowing.borrowedDate)}</span></div>
                          <div className={`flex items-center gap-1 ${borrowing.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                            <Clock className="h-3 w-3" /><span>Due: {formatDate(borrowing.dueDate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BookOpen} title="No books borrowed" description={`${cb.firstName} does not have any books checked out.`} />
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reading History</CardTitle>
                <CardDescription>Complete borrowing history for {cb.firstName}</CardDescription>
              </CardHeader>
              <CardContent>
                {cb.borrowings.length > 0 ? (
                  <DataTable columns={borrowingColumns} data={cb.borrowings} searchKey="book_title" />
                ) : (
                  <EmptyState icon={Library} title="No borrowing history" description="Library borrowing records will appear here." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
