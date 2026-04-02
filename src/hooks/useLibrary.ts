'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, mapId } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { Student } from '@/types';

// ---------- Local types (not touching src/types/index.ts) ----------

export interface LibraryBookRecord {
  id: string;
  _id?: string;
  schoolId: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  copies: number;
  availableCopies: number;
  shelfLocation?: string;
  coverImageUrl?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookLoanRecord {
  id: string;
  _id?: string;
  bookId: string | { _id: string; title: string; author: string; coverImageUrl?: string };
  studentId: string | { _id: string; userId?: { firstName?: string; lastName?: string }; admissionNumber?: string };
  schoolId: string;
  issuedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  issuedDate: string;
  dueDate: string;
  returnedDate?: string;
  status: 'issued' | 'returned' | 'overdue' | 'lost';
  fineAmount: number;
}

export interface ReadingChallengeRecord {
  id: string;
  _id?: string;
  schoolId: string;
  name: string;
  targetBooks: number;
  startDate: string;
  endDate: string;
  rewardPoints: number;
  participants: string[];
}

export interface LeaderboardEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  booksCompleted: number;
  totalPages: number;
}

// ---------- Helper ----------

function unwrapListWithId<T>(res: { data: { data?: unknown } }): T[] {
  return unwrapList<Record<string, unknown>>(res).map((r) => mapId(r)) as unknown as T[];
}

// ---------- Hook ----------

export function useLibrary(schoolId: string) {
  // Books
  const [books, setBooks] = useState<LibraryBookRecord[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksTotal, setBooksTotal] = useState(0);

  // Loans
  const [loans, setLoans] = useState<BookLoanRecord[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);

  // Overdue
  const [overdueLoans, setOverdueLoans] = useState<BookLoanRecord[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);

  // Challenges
  const [challenges, setChallenges] = useState<ReadingChallengeRecord[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // ---- Students (for loan forms) ----

  const [libraryStudents, setLibraryStudents] = useState<Student[]>([]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students');
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
      setLibraryStudents(
        (arr as Record<string, unknown>[]).map((s) => ({
          ...s,
          id: (s._id as string) ?? (s.id as string),
        })) as Student[],
      );
    } catch {
      console.error('Failed to load students for library');
    }
  }, []);

  // ---- Books ----

  const fetchBooks = useCallback(async (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
    setBooksLoading(true);
    try {
      const res = await apiClient.get('/library/books', { params: { schoolId, ...params } });
      const outer = (res.data as Record<string, unknown>);
      const raw = (outer.data ?? outer) as Record<string, unknown>;
      if (Array.isArray(raw)) {
        setBooks(raw.map((r: Record<string, unknown>) => mapId(r)) as unknown as LibraryBookRecord[]);
        setBooksTotal(raw.length);
      } else {
        const arr = raw.books ?? raw.data;
        setBooks(Array.isArray(arr) ? arr.map((r: Record<string, unknown>) => mapId(r)) as unknown as LibraryBookRecord[] : []);
        setBooksTotal(typeof raw.total === 'number' ? raw.total : 0);
      }
    } catch {
      console.error('Failed to load books');
    } finally {
      setBooksLoading(false);
    }
  }, [schoolId]);

  const createBook = useCallback(async (data: {
    title: string; author: string; category: string;
    copies: number; availableCopies: number;
    isbn?: string; shelfLocation?: string; coverImageUrl?: string;
  }) => {
    const res = await apiClient.post('/library/books', { ...data, schoolId });
    const raw = (res.data as Record<string, unknown>).data ?? res.data;
    toast.success('Book added successfully');
    return mapId(raw as Record<string, unknown>) as unknown as LibraryBookRecord;
  }, [schoolId]);

  const updateBook = useCallback(async (bookId: string, data: Record<string, unknown>) => {
    const res = await apiClient.put(`/library/books/${bookId}`, data);
    const raw = (res.data as Record<string, unknown>).data ?? res.data;
    toast.success('Book updated successfully');
    return mapId(raw as Record<string, unknown>) as unknown as LibraryBookRecord;
  }, []);

  const deleteBook = useCallback(async (bookId: string) => {
    await apiClient.delete(`/library/books/${bookId}`);
    toast.success('Book deleted successfully');
  }, []);

  // ---- Loans ----

  const fetchOverdueLoans = useCallback(async () => {
    setOverdueLoading(true);
    try {
      const res = await apiClient.get('/library/loans/overdue', { params: { schoolId } });
      setOverdueLoans(unwrapListWithId<BookLoanRecord>(res));
    } catch {
      console.error('Failed to load overdue loans');
    } finally {
      setOverdueLoading(false);
    }
  }, [schoolId]);

  const fetchAllLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const res = await apiClient.get('/library/loans/overdue', { params: { schoolId } });
      setLoans(unwrapListWithId<BookLoanRecord>(res));
    } catch {
      console.error('Failed to load loans');
    } finally {
      setLoansLoading(false);
    }
  }, [schoolId]);

  const issueLoan = useCallback(async (data: { bookId: string; studentId: string; dueDate: string }) => {
    await apiClient.post('/library/loans/issue', { ...data, schoolId });
    toast.success('Book issued successfully');
  }, [schoolId]);

  const returnLoan = useCallback(async (loanId: string, fineAmount?: number) => {
    await apiClient.patch(`/library/loans/${loanId}/return`, { fineAmount: fineAmount ?? 0 });
    toast.success('Book returned successfully');
  }, []);

  const markLost = useCallback(async (loanId: string, fineAmount: number) => {
    await apiClient.patch(`/library/loans/${loanId}/lost`, { fineAmount });
    toast.success('Book marked as lost');
  }, []);

  // ---- Challenges ----

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const res = await apiClient.get('/library/challenges', { params: { schoolId } });
      setChallenges(unwrapListWithId<ReadingChallengeRecord>(res));
    } catch {
      console.error('Failed to load challenges');
    } finally {
      setChallengesLoading(false);
    }
  }, [schoolId]);

  const createChallenge = useCallback(async (data: {
    name: string; targetBooks: number; startDate: string; endDate: string; rewardPoints?: number;
  }) => {
    await apiClient.post('/library/challenges', { ...data, schoolId });
    toast.success('Challenge created successfully');
  }, [schoolId]);

  const updateChallenge = useCallback(async (challengeId: string, data: Record<string, unknown>) => {
    await apiClient.put(`/library/challenges/${challengeId}`, data);
    toast.success('Challenge updated successfully');
  }, []);

  const deleteChallenge = useCallback(async (challengeId: string) => {
    await apiClient.delete(`/library/challenges/${challengeId}`);
    toast.success('Challenge deleted successfully');
  }, []);

  // ---- Leaderboard ----

  const fetchLeaderboard = useCallback(async (challengeId: string, limit = 20) => {
    setLeaderboardLoading(true);
    try {
      const res = await apiClient.get(`/library/leaderboard/${challengeId}`, { params: { limit } });
      const outer = (res.data as Record<string, unknown>);
      const raw = outer.data ?? outer;
      setLeaderboard(Array.isArray(raw) ? raw as LeaderboardEntry[] : []);
    } catch {
      console.error('Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  return {
    libraryStudents, fetchStudents,
    books, booksLoading, booksTotal, fetchBooks, createBook, updateBook, deleteBook,
    loans, loansLoading, fetchAllLoans,
    overdueLoans, overdueLoading, fetchOverdueLoans,
    issueLoan, returnLoan, markLost,
    challenges, challengesLoading, fetchChallenges, createChallenge, updateChallenge, deleteChallenge,
    leaderboard, leaderboardLoading, fetchLeaderboard,
  };
}
