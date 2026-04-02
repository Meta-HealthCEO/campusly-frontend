// ============================================================
// Accounting / Export Types
// ============================================================

export type AccountingProvider = 'sage_one' | 'xero' | 'quickbooks' | 'pastel' | 'none';
export type VatCode = 'standard' | 'zero_rated' | 'exempt';
export type SyncFrequency = 'manual' | 'daily' | 'weekly';
export type ExportFormat = 'csv' | 'sage_csv' | 'xero_csv' | 'pastel_csv' | 'quickbooks_iif';
export type ExportStatus = 'generating' | 'ready' | 'failed';

export interface GLMapping {
  feeCategory: string;
  accountCode: string;
  accountName: string;
  vatCode: VatCode;
}

export interface BankMapping {
  paymentMethod: string;
  bankAccountCode: string;
  bankAccountName: string;
}

export interface AccountingConfig {
  id: string;
  schoolId: string;
  provider: AccountingProvider;
  vatRegistered: boolean;
  vatNumber?: string;
  glMapping: GLMapping[];
  bankMapping: BankMapping[];
  syncFrequency: SyncFrequency;
  lastExportAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountingExport {
  id: string;
  schoolId: string;
  exportedBy: string | { id: string; name: string; email: string };
  format: ExportFormat;
  dateRange: { from: string; to: string };
  recordCount: number;
  fileName: string;
  status: ExportStatus;
  downloadUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RevenueByCategory {
  category: string;
  totalInvoiced: number;
  count: number;
}

export interface IncomeStatement {
  revenueByCategory: RevenueByCategory[];
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  writeOffs: number;
}

export interface CashFlowPoint {
  date: string;
  amount: number;
  runningTotal: number;
}
