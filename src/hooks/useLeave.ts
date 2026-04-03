'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  LeaveRequest,
  LeaveBalance,
  LeaveCalendarEntry,
  SubstituteSuggestion,
} from '@/types';

interface RequestParams {
  page?: number;
  limit?: number;
  status?: string;
  leaveType?: string;
  staffId?: string;
}

interface BalanceParams {
  year?: number;
  staffId?: string;
}

interface SubstituteParams {
  startDate: string;
  endDate: string;
  subjectId?: string;
}

export function useLeave() {
  // ─── Request state ────────────────────────────────────────────────
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsTotal, setRequestsTotal] = useState(0);

  // ─── Balance state ────────────────────────────────────────────────
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);

  // ─── Calendar state ───────────────────────────────────────────────
  const [calendar, setCalendar] = useState<LeaveCalendarEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // ─── Substitutes state ────────────────────────────────────────────
  const [substitutes, setSubstitutes] = useState<SubstituteSuggestion[]>([]);
  const [substitutesLoading, setSubstitutesLoading] = useState(false);

  const fetchRequests = useCallback(async (schoolId: string, params?: RequestParams) => {
    setRequestsLoading(true);
    try {
      const response = await apiClient.get(`/leave/requests`, { params: { ...params, schoolId } });
      const raw = unwrapResponse<{ requests?: LeaveRequest[]; total?: number }>(response);
      const list = Array.isArray(raw)
        ? (raw as LeaveRequest[])
        : unwrapList<LeaveRequest>(response, 'requests');
      setRequests(list);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        setRequestsTotal((raw as Record<string, unknown>).total as number ?? list.length);
      } else {
        setRequestsTotal(list.length);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch leave requests:', extractErrorMessage(err));
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (data: {
    schoolId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay: boolean;
    halfDayPeriod: 'morning' | 'afternoon' | null;
    documentUrl: string | null;
    substituteTeacherId: string | null;
  }) => {
    const response = await apiClient.post('/leave/requests', data);
    return unwrapResponse<LeaveRequest>(response);
  }, []);

  const reviewRequest = useCallback(async (id: string, data: {
    status: 'approved' | 'declined';
    reviewComment?: string;
    substituteTeacherId?: string;
  }) => {
    const response = await apiClient.patch(`/leave/requests/${id}/review`, data);
    return unwrapResponse<LeaveRequest>(response);
  }, []);

  const cancelRequest = useCallback(async (id: string) => {
    const response = await apiClient.patch(`/leave/requests/${id}/cancel`);
    return unwrapResponse<LeaveRequest>(response);
  }, []);

  const fetchBalances = useCallback(async (schoolId: string, params?: BalanceParams) => {
    setBalancesLoading(true);
    try {
      const response = await apiClient.get('/leave/balances', { params: { ...params, schoolId } });
      const list = unwrapList<LeaveBalance>(response, 'balances');
      setBalances(list);
    } catch (err: unknown) {
      console.error('Failed to fetch leave balances:', extractErrorMessage(err));
      setBalances([]);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const initializeBalances = useCallback(async (data: { schoolId: string; year: number }) => {
    const response = await apiClient.post('/leave/balances/initialize', data);
    return unwrapResponse<{ initialized: number }>(response);
  }, []);

  const fetchCalendar = useCallback(async (schoolId: string, startDate: string, endDate: string) => {
    setCalendarLoading(true);
    try {
      const response = await apiClient.get('/leave/calendar', {
        params: { schoolId, startDate, endDate },
      });
      const list = unwrapList<LeaveCalendarEntry>(response);
      setCalendar(list);
    } catch (err: unknown) {
      console.error('Failed to fetch leave calendar:', extractErrorMessage(err));
      setCalendar([]);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchSubstitutes = useCallback(async (schoolId: string, params: SubstituteParams) => {
    setSubstitutesLoading(true);
    try {
      const response = await apiClient.get('/leave/substitutes', {
        params: { ...params, schoolId },
      });
      const list = unwrapList<SubstituteSuggestion>(response);
      setSubstitutes(list);
    } catch (err: unknown) {
      console.error('Failed to fetch substitutes:', extractErrorMessage(err));
      setSubstitutes([]);
    } finally {
      setSubstitutesLoading(false);
    }
  }, []);

  return {
    requests, requestsLoading, requestsTotal, fetchRequests,
    createRequest, reviewRequest, cancelRequest,
    balances, balancesLoading, fetchBalances, initializeBalances,
    calendar, calendarLoading, fetchCalendar,
    substitutes, substitutesLoading, fetchSubstitutes,
  };
}
