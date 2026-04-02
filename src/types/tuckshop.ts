// ============================================================
// Tuckshop Types
// ============================================================

import type { Student } from './common';

export interface TuckshopItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number; // cents
  image?: string;
  allergens: string[];
  isAvailable: boolean;
  stockCount?: number;
}

export interface TuckshopOrder {
  id: string;
  studentId: string;
  student: Student;
  items: TuckshopOrderItem[];
  totalAmount: number; // cents
  walletTransactionId: string;
  servedBy: string;
  createdAt: string;
}

export interface TuckshopOrderItem {
  id: string;
  itemId: string;
  item: TuckshopItem;
  quantity: number;
  price: number; // cents
}

export interface DailySalesSummary {
  date: string;
  totalTransactions: number;
  totalRevenue: number; // cents
  topItems: { name: string; quantity: number; revenue: number }[];
  averageTransaction: number;
}
