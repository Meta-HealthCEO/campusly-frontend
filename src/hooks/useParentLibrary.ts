import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { BookBorrowing } from '@/types';

export interface ChildLibraryData {
  childId: string;
  firstName: string;
  lastName: string;
  borrowings: BookBorrowing[];
  currentlyBorrowed: BookBorrowing[];
  overdue: BookBorrowing[];
  returned: BookBorrowing[];
}

interface ParentLibraryResult {
  childBorrowings: ChildLibraryData[];
  loading: boolean;
}

export function useParentLibrary(): ParentLibraryResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childBorrowings, setChildBorrowings] = useState<ChildLibraryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading) return;
    if (children.length === 0) { setLoading(false); return; }

    async function fetchData() {
      try {
        const results: ChildLibraryData[] = [];
        for (const child of children) {
          let borrowings: BookBorrowing[] = [];
          try {
            const res = await apiClient.get(`/library/loans/student/${child.id}`);
            borrowings = unwrapList<BookBorrowing>(res);
          } catch { /* no borrowings */ }

          const userId = child.userId as { firstName?: string; lastName?: string } | string | undefined;
          const populatedUser = typeof userId === 'object' && userId !== null ? userId : undefined;

          results.push({
            childId: child.id,
            firstName: child.user?.firstName ?? populatedUser?.firstName ?? child.firstName ?? '',
            lastName: child.user?.lastName ?? populatedUser?.lastName ?? child.lastName ?? '',
            borrowings,
            currentlyBorrowed: borrowings.filter((b) => b.status === 'borrowed'),
            overdue: borrowings.filter((b) => b.status === 'overdue'),
            returned: borrowings.filter((b) => b.status === 'returned'),
          });
        }
        setChildBorrowings(results);
      } catch {
        console.error('Failed to load library data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [parentLoading, children]);

  return { childBorrowings, loading: loading || parentLoading };
}
