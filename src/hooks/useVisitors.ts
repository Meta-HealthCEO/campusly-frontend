import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  VisitorRecord,
  RegisterVisitorPayload,
  PreRegistration,
  CreatePreRegistrationPayload,
  LateArrival,
  RecordLateArrivalPayload,
  EarlyDeparture,
  RecordEarlyDeparturePayload,
  DailyVisitorReport,
  OnPremisesVisitor,
  VisitorListResponse,
} from '@/types';

interface VisitorFilters {
  status?: string;
  purpose?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface LateEarlyFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  classId?: string;
  reason?: string;
  page?: number;
  limit?: number;
}

export function useVisitors() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [visitorsMeta, setVisitorsMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [visitorsLoading, setVisitorsLoading] = useState(false);

  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
  const [preRegLoading, setPreRegLoading] = useState(false);

  const [lateArrivals, setLateArrivals] = useState<LateArrival[]>([]);
  const [lateLoading, setLateLoading] = useState(false);

  const [earlyDepartures, setEarlyDepartures] = useState<EarlyDeparture[]>([]);
  const [earlyLoading, setEarlyLoading] = useState(false);

  const [dailyReport, setDailyReport] = useState<DailyVisitorReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [onPremises, setOnPremises] = useState<OnPremisesVisitor[]>([]);
  const [onPremisesCount, setOnPremisesCount] = useState(0);
  const [onPremisesLoading, setOnPremisesLoading] = useState(false);

  // ─── Visitor CRUD ──────────────────────────────────────────────
  const fetchVisitors = useCallback(async (schoolId: string, filters?: VisitorFilters) => {
    setVisitorsLoading(true);
    try {
      const res = await apiClient.get('/visitors', {
        params: { schoolId, ...filters },
      });
      const raw = unwrapResponse<VisitorListResponse>(res);
      setVisitors(raw.visitors ?? []);
      setVisitorsMeta({
        total: raw.total ?? 0,
        page: raw.page ?? 1,
        totalPages: raw.totalPages ?? 1,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch visitors', err);
      setVisitors([]);
    } finally {
      setVisitorsLoading(false);
    }
  }, []);

  const registerVisitor = useCallback(async (data: RegisterVisitorPayload): Promise<VisitorRecord> => {
    const res = await apiClient.post('/visitors', data);
    return unwrapResponse<VisitorRecord>(res);
  }, []);

  const checkOutVisitor = useCallback(async (id: string, notes?: string): Promise<VisitorRecord> => {
    const res = await apiClient.patch(`/visitors/${id}/checkout`, { notes });
    return unwrapResponse<VisitorRecord>(res);
  }, []);

  // ─── Pre-Registration ─────────────────────────────────────────
  const fetchPreRegistrations = useCallback(async (
    schoolId: string,
    filters?: { expectedDate?: string; status?: string },
  ) => {
    setPreRegLoading(true);
    try {
      const res = await apiClient.get('/visitors/pre-register', {
        params: { schoolId, ...filters },
      });
      const list = unwrapList<PreRegistration>(res, 'preRegistrations');
      setPreRegistrations(list);
    } catch (err: unknown) {
      console.error('Failed to fetch pre-registrations', err);
      setPreRegistrations([]);
    } finally {
      setPreRegLoading(false);
    }
  }, []);

  const createPreRegistration = useCallback(async (data: CreatePreRegistrationPayload) => {
    const res = await apiClient.post('/visitors/pre-register', data);
    return unwrapResponse<PreRegistration>(res);
  }, []);

  const cancelPreRegistration = useCallback(async (id: string) => {
    await apiClient.patch(`/visitors/pre-register/${id}/cancel`);
  }, []);

  // ─── Late Arrivals ────────────────────────────────────────────
  const fetchLateArrivals = useCallback(async (schoolId: string, filters?: LateEarlyFilters) => {
    setLateLoading(true);
    try {
      const res = await apiClient.get('/visitors/late-arrivals', {
        params: { schoolId, ...filters },
      });
      const list = unwrapList<LateArrival>(res, 'lateArrivals');
      setLateArrivals(list);
    } catch (err: unknown) {
      console.error('Failed to fetch late arrivals', err);
      setLateArrivals([]);
    } finally {
      setLateLoading(false);
    }
  }, []);

  const recordLateArrival = useCallback(async (data: RecordLateArrivalPayload): Promise<LateArrival> => {
    const res = await apiClient.post('/visitors/late-arrivals', data);
    return unwrapResponse<LateArrival>(res);
  }, []);

  // ─── Early Departures ─────────────────────────────────────────
  const fetchEarlyDepartures = useCallback(async (schoolId: string, filters?: LateEarlyFilters) => {
    setEarlyLoading(true);
    try {
      const res = await apiClient.get('/visitors/early-departures', {
        params: { schoolId, ...filters },
      });
      const list = unwrapList<EarlyDeparture>(res, 'earlyDepartures');
      setEarlyDepartures(list);
    } catch (err: unknown) {
      console.error('Failed to fetch early departures', err);
      setEarlyDepartures([]);
    } finally {
      setEarlyLoading(false);
    }
  }, []);

  const recordEarlyDeparture = useCallback(async (
    data: RecordEarlyDeparturePayload,
  ): Promise<EarlyDeparture> => {
    const res = await apiClient.post('/visitors/early-departures', data);
    return unwrapResponse<EarlyDeparture>(res);
  }, []);

  // ─── Daily Report ─────────────────────────────────────────────
  const fetchDailyReport = useCallback(async (schoolId: string, date: string) => {
    setReportLoading(true);
    try {
      const res = await apiClient.get('/visitors/daily-report', {
        params: { schoolId, date },
      });
      setDailyReport(unwrapResponse<DailyVisitorReport>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch daily report', err);
      setDailyReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  // ─── On-Premises (Emergency) ──────────────────────────────────
  const fetchOnPremises = useCallback(async (schoolId: string) => {
    setOnPremisesLoading(true);
    try {
      const res = await apiClient.get('/visitors/on-premises', {
        params: { schoolId },
      });
      const raw = unwrapResponse<{ visitors: OnPremisesVisitor[]; totalOnPremises: number }>(res);
      setOnPremises(raw.visitors ?? []);
      setOnPremisesCount(raw.totalOnPremises ?? 0);
    } catch (err: unknown) {
      console.error('Failed to fetch on-premises visitors', err);
      setOnPremises([]);
      setOnPremisesCount(0);
    } finally {
      setOnPremisesLoading(false);
    }
  }, []);

  return {
    // Visitors
    visitors, visitorsMeta, visitorsLoading,
    fetchVisitors, registerVisitor, checkOutVisitor,
    // Pre-registrations
    preRegistrations, preRegLoading,
    fetchPreRegistrations, createPreRegistration, cancelPreRegistration,
    // Late arrivals
    lateArrivals, lateLoading,
    fetchLateArrivals, recordLateArrival,
    // Early departures
    earlyDepartures, earlyLoading,
    fetchEarlyDepartures, recordEarlyDeparture,
    // Daily report
    dailyReport, reportLoading, fetchDailyReport,
    // On-premises
    onPremises, onPremisesCount, onPremisesLoading, fetchOnPremises,
  };
}
