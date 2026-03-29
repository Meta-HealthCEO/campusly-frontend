'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  BookOpen,
  Library,
  Clock,
  MapPin,
  BookCopy,
  Target,
} from 'lucide-react';
import { mockBooks, mockBorrowings, mockStudents } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

const currentStudent = mockStudents[0];

// Current borrowings for student
const myBorrowings = mockBorrowings.filter(
  (b) => b.studentId === currentStudent.id
);
const currentBorrowings = myBorrowings.filter(
  (b) => b.status === 'borrowed' || b.status === 'overdue'
);
const returnedBorrowings = myBorrowings.filter(
  (b) => b.status === 'returned'
);

// Reading challenge
const booksReadThisTerm = returnedBorrowings.length;
const readingGoal = 10;

export default function StudentLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Browse books and track your borrowings"
      />

      {/* Reading Challenge */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
              <Target className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Reading Challenge</h3>
                <span className="text-sm text-muted-foreground">
                  {booksReadThisTerm} / {readingGoal} books
                </span>
              </div>
              <Progress value={(booksReadThisTerm / readingGoal) * 100} />
              <p className="text-xs text-muted-foreground">
                Read {readingGoal - booksReadThisTerm} more books to complete
                your term reading challenge!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="borrowed">
        <TabsList>
          <TabsTrigger value="borrowed">
            Currently Borrowed ({currentBorrowings.length})
          </TabsTrigger>
          <TabsTrigger value="catalogue">Browse Catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="borrowed">
          {currentBorrowings.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Books Borrowed"
              description="You do not have any books checked out right now."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {currentBorrowings.map((borrowing) => (
                <Card key={borrowing.id}>
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-semibold">
                          {borrowing.book.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {borrowing.book.author}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Due: {formatDate(borrowing.dueDate)}
                          </span>
                          <Badge
                            variant={
                              borrowing.status === 'overdue'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {borrowing.status === 'overdue'
                              ? 'Overdue'
                              : 'Borrowed'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalogue">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockBooks.map((book) => (
              <Card key={book.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-20 w-14 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                      <BookCopy className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold leading-tight">
                        {book.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {book.author}
                      </p>
                      <Badge variant="secondary">{book.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {book.location}
                    </div>
                    <Badge
                      variant={
                        book.availableCopies > 0 ? 'default' : 'destructive'
                      }
                    >
                      {book.availableCopies > 0
                        ? `${book.availableCopies} available`
                        : 'All out'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
