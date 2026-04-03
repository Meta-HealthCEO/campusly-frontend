// ─── Enums ────────────────────────────────────────────────────────────────────

export type PayrollRunStatus = 'draft' | 'reviewed' | 'approved' | 'processed';
export type AccountType = 'cheque' | 'savings' | 'transmission';
export type CertificateType = 'IRP5' | 'IT3a';
export type CertificateStatus = 'generated' | 'issued' | 'amended';
export type AdjustmentType = 'addition' | 'deduction';

// ─── Tax Table ────────────────────────────────────────────────────────────────

export interface TaxBracket {
  from: number;
  to: number | null;
  rate: number;
  baseAmount: number;
}

export interface TaxTable {
  id: string;
  schoolId: string;
  taxYear: number;
  brackets: TaxBracket[];
  rebates: { primary: number; secondary: number; tertiary: number };
  taxThresholds: { under65: number; age65to74: number; age75plus: number };
  uifRate: number;
  uifCeiling: number;
  sdlRate: number;
  medicalCredits: { main: number; firstDependant: number; additionalDependant: number };
}

// ─── Salary Record ────────────────────────────────────────────────────────────

export interface Allowance {
  name: string;
  amount: number;
  taxable: boolean;
}

export interface DeductionItem {
  name: string;
  amount: number;
  preTax: boolean;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: AccountType;
}

export interface SalaryRecord {
  id: string;
  schoolId: string;
  staffId: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  basicSalary: number;
  allowances: Allowance[];
  deductions: DeductionItem[];
  bankDetails: BankDetails;
  taxNumber: string | null;
  uifNumber: string | null;
  dateOfBirth: string;
  startDate: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SalaryHistoryEntry {
  changedAt: string;
  changedBy: { id: string; firstName: string; lastName: string };
  field: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
}

export interface CreateSalaryPayload {
  staffId: string;
  basicSalary: number;
  allowances: Allowance[];
  deductions: DeductionItem[];
  bankDetails: BankDetails;
  taxNumber: string | null;
  uifNumber: string | null;
  dateOfBirth: string;
  startDate: string;
  department: string | null;
}

// ─── Payroll Run ──────────────────────────────────────────────────────────────

export interface Adjustment {
  name: string;
  amount: number;
  type: AdjustmentType;
}

export interface PayrollItem {
  _id: string;
  staffId: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  salaryRecordId: string;
  basicSalary: number;
  allowances: number;
  grossPay: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  preTaxDeductions: number;
  taxableIncome: number;
  paye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdl: number;
  postTaxDeductions: number;
  adjustments: Adjustment[];
  netPay: number;
}

export interface PayrollTotals {
  grossPay: number;
  totalPAYE: number;
  totalUIF: number;
  totalUIFEmployer: number;
  totalSDL: number;
  totalDeductions: number;
  totalNetPay: number;
  employeeCount: number;
}

export interface PayrollRun {
  id: string;
  schoolId: string;
  month: number;
  year: number;
  description: string | null;
  status: PayrollRunStatus;
  totals: PayrollTotals;
  items: PayrollItem[];
  createdBy: { id: string; firstName: string; lastName: string };
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  approvedAt: string | null;
  processedBy: { id: string; firstName: string; lastName: string } | null;
  processedAt: string | null;
  createdAt: string;
}

// ─── Payslip ──────────────────────────────────────────────────────────────────

export interface PayslipLine {
  description: string;
  amount: number;
}

export interface Payslip {
  payslipNumber: string;
  staffName: string;
  department: string;
  payPeriod: string;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

// ─── Tax Certificate ──────────────────────────────────────────────────────────

export interface TaxCertificate {
  id: string;
  staffId: { id: string; firstName: string; lastName: string };
  taxYear: number;
  certificateType: CertificateType;
  certificateNumber: string;
  totalIncome: number;
  totalPAYE: number;
  totalUIF: number;
  totalDeductions: number;
  status: CertificateStatus;
}

// ─── CTC Report ───────────────────────────────────────────────────────────────

export interface DepartmentCost {
  department: string;
  headcount: number;
  totalBasic: number;
  totalAllowances: number;
  totalEmployerContributions: number;
  costToCompany: number;
}

export interface CostToCompanyReport {
  month: number;
  year: number;
  departments: DepartmentCost[];
  schoolTotal: {
    headcount: number;
    totalBasic: number;
    totalAllowances: number;
    totalEmployerContributions: number;
    costToCompany: number;
  };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface SalaryFilters {
  department?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
