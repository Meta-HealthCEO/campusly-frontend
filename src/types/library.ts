// ============================================================
// Library Types
// ============================================================

import type { Student } from './common';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  location: string;
}

export interface BookBorrowing {
  id: string;
  bookId: string;
  book: LibraryBook;
  studentId: string;
  student: Student;
  borrowedDate: string;
  dueDate: string;
  returnedDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
}
