// ============================================================
// Wallet Types
// ============================================================

export interface Wallet {
  id: string;
  _id?: string;
  studentId: string;
  schoolId?: string;
  balance: number; // cents
  currency?: string;
  wristbandId?: string;
  dailyLimit: number; // cents
  isActive: boolean;
  autoTopUpEnabled?: boolean;
  autoTopUpAmount?: number;
  autoTopUpThreshold?: number;
  lastTopUp?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'topup' | 'purchase' | 'refund';
  amount: number; // cents
  balance: number; // cents
  description: string;
  reference?: string;
  createdAt: string;
}
