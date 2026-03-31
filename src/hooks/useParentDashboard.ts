import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentParent } from './useCurrentParent';
import type { Invoice, Notification, Wallet, StudentGrade } from '@/types';

export interface ChildDashboardData {
  childId: string;
  firstName: string;
  lastName: string;
  gradeName: string;
  className: string;
  admissionNumber: string;
  walletBalance: number;
  unpaidInvoice: Invoice | null;
  avgGrade: number;
}

interface ParentDashboardResult {
  childData: ChildDashboardData[];
  notifications: Notification[];
  invoices: Invoice[];
  loading: boolean;
}

export function useParentDashboard(): ParentDashboardResult {
  const { user } = useAuthStore();
  const { children, loading: parentLoading } = useCurrentParent();
  const [childData, setChildData] = useState<ChildDashboardData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading || children.length === 0) {
      if (!parentLoading) setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [invRes, notifRes, ...walletResults] = await Promise.all([
          apiClient.get(`/fees/invoices/school/${user?.schoolId}`).catch(() => null),
          apiClient.get('/notifications').catch(() => null),
          ...children.map((child) =>
            apiClient.get(`/wallets/student/${child.id}`).catch(() => null)
          ),
        ]);

        // Process invoices
        const allInvoices: Invoice[] = invRes
          ? unwrapList<Invoice>(invRes)
          : [];
        setInvoices(allInvoices);

        // Process notifications
        const allNotifs: Notification[] = notifRes
          ? unwrapList<Notification>(notifRes)
          : [];
        setNotifications(allNotifs.slice(0, 5));

        // Fetch marks per child in parallel
        const marksResults = await Promise.allSettled(
          children.map((child) => apiClient.get(`/academic/marks/student/${child.id}`))
        );

        // Build per-child data
        const data: ChildDashboardData[] = children.map((child, i) => {
          // Wallet
          const walletRaw = walletResults[i]?.data?.data ?? walletResults[i]?.data;
          const wallet: Wallet | null = walletRaw?.wallet ?? walletRaw ?? null;

          // Unpaid invoice
          const unpaid = allInvoices.find(
            (inv) => inv.studentId === child.id && inv.balanceDue > 0
          ) ?? null;

          // Average grade
          let avgGrade = 0;
          const marksRes = marksResults[i];
          if (marksRes.status === 'fulfilled') {
            const marks = unwrapList<StudentGrade>(marksRes.value);
            if (marks.length > 0) {
              const total = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
              avgGrade = Math.round(total / marks.length);
            }
          }

          const firstName = child.user?.firstName ?? child.firstName ?? '';
          const lastName = child.user?.lastName ?? child.lastName ?? '';

          return {
            childId: child.id,
            firstName,
            lastName,
            gradeName: child.grade?.name ?? '',
            className: child.class?.name ?? '',
            admissionNumber: child.admissionNumber ?? '',
            walletBalance: wallet?.balance ?? 0,
            unpaidInvoice: unpaid,
            avgGrade,
          };
        });

        setChildData(data);
      } catch {
        console.error('Failed to load parent dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [parentLoading, children, user?.schoolId]);

  return { childData, notifications, invoices, loading: loading || parentLoading };
}
