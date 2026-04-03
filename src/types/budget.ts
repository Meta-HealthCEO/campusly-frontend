// ============================================================
// Budget Management Types
// ============================================================

export type BudgetStatus = 'draft' | 'approved' | 'revised';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'cash' | 'eft' | 'card' | 'debit_order' | 'cheque' | 'other';
export type AlertLevel = 'warning' | 'critical';
export type VarianceStatus = 'under_budget' | 'warning' | 'over_budget';

// ─── Category ───────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  parentId: string | null;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  children?: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  schoolId: string;
  name: string;
  code: string;
  parentId?: string | null;
  description?: string;
}

// ─── Budget ─────────────────────────────────────────────────────────────────

export interface BudgetLineItem {
  id?: string;
  categoryId: string | { id: string; name: string; code: string };
  description?: string;
  annualAmount: number;
  termAmounts?: number[];
  notes?: string;
}

export interface Budget {
  id: string;
  schoolId: string;
  year: number;
  name: string;
  description?: string;
  status: BudgetStatus;
  totalBudgeted: number;
  lineItems: BudgetLineItem[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetPayload {
  schoolId: string;
  year: number;
  name: string;
  description?: string;
  lineItems: {
    categoryId: string;
    description?: string;
    annualAmount: number;
    termAmounts?: number[];
    notes?: string;
  }[];
}

// ─── Expense ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  schoolId: string;
  categoryId: string | { id: string; name: string; code: string };
  budgetId?: string;
  amount: number;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  term?: number;
  notes?: string;
  status: ExpenseStatus;
  submittedBy: string | { id: string; name: string; email: string };
  approvedBy?: string | { id: string; name: string; email: string };
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  schoolId: string;
  categoryId: string;
  budgetId?: string;
  amount: number;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  term?: number;
  notes?: string;
}

export interface ExpenseFilters {
  categoryId?: string;
  budgetId?: string;
  status?: string;
  term?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Reports ────────────────────────────────────────────────────────────────

export interface VarianceCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  utilizationPercent: number;
  status: VarianceStatus;
}

export interface VarianceReport {
  budgetId: string;
  year: number;
  term: number | null;
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  categories: VarianceCategory[];
}

export interface MonthlyEntry {
  month: number;
  label: string;
  income: number;
  expenditure: number;
  surplus: number;
  cumulativeIncome: number;
  cumulativeExpenditure: number;
}

export interface MonthlyReport {
  year: number;
  months: MonthlyEntry[];
}

export interface CashFlowProjection {
  month: string;
  expectedIncome: number;
  plannedExpenditure: number;
  projectedBalance: number;
}

export interface CashFlowReport {
  currentBalance: number;
  projections: CashFlowProjection[];
}

export interface ComparisonCategoryValue {
  year: number;
  budgeted: number;
  actual: number;
}

export interface ComparisonCategory {
  categoryName: string;
  values: ComparisonCategoryValue[];
}

export interface ComparisonReport {
  years: number[];
  categories: ComparisonCategory[];
  totals: { year: number; budgeted: number; actual: number }[];
}

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  budgeted: number;
  actual: number;
  utilizationPercent: number;
  alertLevel: AlertLevel;
  message: string;
}
