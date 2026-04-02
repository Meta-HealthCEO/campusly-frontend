// ============================================================
// Fee / Financial Types
// ============================================================

import type { Student, Parent } from './common';

export type FeeFrequency = 'once_off' | 'per_term' | 'per_year' | 'monthly';
export type FeeCategory = 'tuition' | 'extramural' | 'camp' | 'uniform' | 'transport' | 'other';

export interface FeeType {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  amount: number; // in cents
  frequency: FeeFrequency;
  category: FeeCategory;
  schoolId: string;
  gradeIds?: string[];
  isOptional?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  student: Student;
  parentId: string;
  parent: Parent;
  items: InvoiceItem[];
  totalAmount: number; // cents
  paidAmount: number; // cents
  balanceDue: number; // cents
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  dueDate: string;
  issuedDate: string;
  term: number;
  year: number;
}

export interface InvoiceItem {
  id: string;
  feeTypeId: string;
  feeType: FeeType;
  description: string;
  amount: number; // cents
  quantity: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  parentId: string;
  amount: number; // cents
  method: 'cash' | 'eft' | 'card' | 'debit_order' | 'wallet';
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
}

export interface PaymentArrangement {
  id: string;
  parentId: string;
  invoiceId: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  startDate: string;
  status: 'active' | 'completed' | 'defaulted';
}

export interface DebtorEntry {
  parentId: string;
  parentName: string;
  studentName: string;
  grade: string;
  totalOwed: number; // cents
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  lastPaymentDate?: string;
}
