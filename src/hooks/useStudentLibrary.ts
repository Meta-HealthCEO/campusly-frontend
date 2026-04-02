import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { LibraryBook, BookBorrowing } from '@/types';

interface StudentLibraryResult {
  books: LibraryBook[];
  borrowings: BookBorrowing[];
  loading: boolean;
}

export function useStudentLibrary(): StudentLibraryResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [borrowings, setBorrowings] = useState<BookBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    const currentStudent = student;
    async function fetchData() {
      const sid = currentStudent._id ?? currentStudent.id;
      const results = await Promise.allSettled([
        apiClient.get('/library/books'),
        apiClient.get(`/library/loans/student/${sid}`),
      ]);

      if (results[0].status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(results[0].value, 'books');
        setBooks(arr.map(mapId) as unknown as LibraryBook[]);
      }

      if (results[1].status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(results[1].value);
        setBorrowings(arr.map(mapId) as unknown as BookBorrowing[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [student, studentLoading]);

  return { books, borrowings, loading: studentLoading || loading };
}
