'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

/* ── Local types (NOT modifying src/types/index.ts) ── */

export interface BusStop {
  name: string;
  time: string;
  latitude?: number;
  longitude?: number;
}

export interface BusRoute {
  id: string;
  name: string;
  schoolId: string;
  driverName: string;
  driverPhone: string;
  vehicleRegistration: string;
  capacity: number;
  stops: BusStop[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportAssignment {
  id: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  busRouteId: PopulatedRoute | string;
  stopName: string;
  direction: 'morning' | 'afternoon' | 'both';
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedStudent {
  _id: string;
  userId?: { firstName?: string; lastName?: string };
  admissionNumber?: string;
  gradeId?: { name?: string } | string;
}

export interface PopulatedRoute {
  _id: string;
  name: string;
}

export interface BoardingLog {
  id: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  routeId: PopulatedRoute | string;
  boardedAt: string;
  alightedAt: string | null;
  boardingLat?: number;
  boardingLng?: number;
  alightingLat?: number;
  alightingLng?: number;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'delay' | 'breakdown' | 'route_change' | 'emergency' | 'weather';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TransportAlert {
  id: string;
  schoolId: string;
  routeId?: PopulatedRoute | string | null;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  resolvedAt: string | null;
  createdBy: { _id: string; name?: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

/* ── Mapping helpers ── */

function mapId<T extends Record<string, unknown>>(item: T): T & { id: string } {
  return { ...item, id: (item._id as string) ?? (item.id as string) };
}

/* ── Hook ── */

export function useTransport() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [boardingLogs, setBoardingLogs] = useState<BoardingLog[]>([]);
  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Routes ── */
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await apiClient.get('/transport/routes', { params: { schoolId } });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.busRoutes ?? raw.data ?? [];
      setRoutes(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load transport routes';
      toast.error(msg);
    }
  }, [schoolId]);

  const createRoute = async (data: Omit<BusRoute, 'id' | 'createdAt' | 'updatedAt'>) => {
    await apiClient.post('/transport/routes', { ...data, schoolId });
    toast.success('Bus route created successfully');
    await fetchRoutes();
  };

  const updateRoute = async (id: string, data: Partial<BusRoute>) => {
    await apiClient.put(`/transport/routes/${id}`, data);
    toast.success('Bus route updated successfully');
    await fetchRoutes();
  };

  const deleteRoute = async (id: string) => {
    await apiClient.delete(`/transport/routes/${id}`);
    toast.success('Bus route deleted');
    await fetchRoutes();
  };

  /* ── Assignments ── */
  const fetchAssignments = useCallback(async (busRouteId?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (busRouteId) params.busRouteId = busRouteId;
      const res = await apiClient.get('/transport/assignments', { params });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.assignments ?? raw.data ?? [];
      setAssignments(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load transport assignments';
      toast.error(msg);
    }
  }, [schoolId]);

  const createAssignment = async (data: {
    studentId: string;
    busRouteId: string;
    stopName: string;
    direction: 'morning' | 'afternoon' | 'both';
  }) => {
    await apiClient.post('/transport/assignments', { ...data, schoolId });
    toast.success('Student assigned to route');
    await fetchAssignments();
  };

  const updateAssignment = async (id: string, data: {
    busRouteId?: string;
    stopName?: string;
    direction?: 'morning' | 'afternoon' | 'both';
  }) => {
    await apiClient.put(`/transport/assignments/${id}`, data);
    toast.success('Assignment updated');
    await fetchAssignments();
  };

  const deleteAssignment = async (id: string) => {
    await apiClient.delete(`/transport/assignments/${id}`);
    toast.success('Assignment removed');
    await fetchAssignments();
  };

  /* ── Boarding Logs ── */
  const fetchBoardingLogs = useCallback(async (filters?: {
    routeId?: string;
    studentId?: string;
    date?: string;
  }) => {
    try {
      const params: Record<string, string> = {};
      if (filters?.routeId) params.routeId = filters.routeId;
      if (filters?.studentId) params.studentId = filters.studentId;
      if (filters?.date) params.date = filters.date;
      const res = await apiClient.get('/transport/boarding', { params });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.boardingLogs ?? raw.data ?? [];
      setBoardingLogs(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load boarding logs';
      toast.error(msg);
    }
  }, []);

  const createBoardingLog = async (data: {
    studentId: string;
    routeId: string;
    boardedAt: string;
    boardingLat?: number;
    boardingLng?: number;
  }) => {
    await apiClient.post('/transport/boarding', { ...data, schoolId });
    toast.success('Boarding logged');
    await fetchBoardingLogs({ date: new Date().toISOString().split('T')[0] });
  };

  const logAlight = async (id: string, data: {
    alightedAt: string;
    alightingLat?: number;
    alightingLng?: number;
  }) => {
    await apiClient.patch(`/transport/boarding/${id}/alight`, data);
    toast.success('Alighting logged');
    await fetchBoardingLogs({ date: new Date().toISOString().split('T')[0] });
  };

  /* ── Alerts ── */
  const fetchAlerts = useCallback(async (isResolved?: boolean) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (isResolved !== undefined) params.isResolved = String(isResolved);
      const res = await apiClient.get('/transport/alerts', { params });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.alerts ?? raw.data ?? [];
      setAlerts(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load transport alerts';
      toast.error(msg);
    }
  }, [schoolId]);

  const createAlert = async (data: {
    routeId?: string;
    type: AlertType;
    title: string;
    message: string;
    severity: AlertSeverity;
  }) => {
    await apiClient.post('/transport/alerts', {
      ...data,
      schoolId,
      createdBy: user?.id ?? '',
    });
    toast.success('Transport alert created');
    await fetchAlerts();
  };

  const resolveAlert = async (id: string) => {
    await apiClient.patch(`/transport/alerts/${id}/resolve`);
    toast.success('Alert resolved');
    await fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await apiClient.delete(`/transport/alerts/${id}`);
    toast.success('Alert deleted');
    await fetchAlerts();
  };

  /* ── Initial load ── */
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      fetchRoutes(),
      fetchAssignments(),
      fetchBoardingLogs({ date: new Date().toISOString().split('T')[0] }),
      fetchAlerts(),
    ]).finally(() => setLoading(false));
  }, [schoolId, fetchRoutes, fetchAssignments, fetchBoardingLogs, fetchAlerts]);

  return {
    routes, assignments, boardingLogs, alerts, loading,
    fetchRoutes, createRoute, updateRoute, deleteRoute,
    fetchAssignments, createAssignment, updateAssignment, deleteAssignment,
    fetchBoardingLogs, createBoardingLog, logAlight,
    fetchAlerts, createAlert, resolveAlert, deleteAlert,
  };
}
