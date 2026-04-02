'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  AfterCareRegistration, AfterCareAttendance, PickupAuthorization,
  SignOutLog, AfterCareActivity, AfterCareInvoice, StudentOption,
} from './aftercare-types';
import { mapId } from './aftercare-types';

// Re-export types and helpers for consumers
export type {
  AfterCareRegistration, AfterCareAttendance, PickupAuthorization,
  SignOutLog, AfterCareActivity, AfterCareInvoice, StudentOption,
  PopulatedStudent, PopulatedUser,
} from './aftercare-types';
export { getStudentName, getStudentGrade, getUserName } from './aftercare-types';

export interface StaffOption {
  id: string;
  name: string;
}

export function useAftercare() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [registrations, setRegistrations] = useState<AfterCareRegistration[]>([]);
  const [attendance, setAttendance] = useState<AfterCareAttendance[]>([]);
  const [pickupAuths, setPickupAuths] = useState<PickupAuthorization[]>([]);
  const [signOutLogs, setSignOutLogs] = useState<SignOutLog[]>([]);
  const [activities, setActivities] = useState<AfterCareActivity[]>([]);
  const [invoices, setInvoices] = useState<AfterCareInvoice[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Students (for selects) ── */
  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students');
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
      setStudents(
        arr.map((s: Record<string, unknown>) => {
          const uid = s.userId as Record<string, unknown> | undefined;
          const grd = s.gradeId as Record<string, unknown> | string | undefined;
          return {
            id: (s._id as string) ?? (s.id as string),
            name: uid ? `${uid.firstName ?? ''} ${uid.lastName ?? ''}`.trim() : (s.admissionNumber as string) ?? '',
            grade: typeof grd === 'object' && grd ? (grd.name as string) ?? '' : '',
            admissionNumber: (s.admissionNumber as string) ?? '',
          };
        }),
      );
    } catch {
      console.error('Failed to load students');
    }
  }, []);

  /* ── Staff (for activity supervisor selects) ── */
  const fetchStaffOptions = useCallback(async () => {
    try {
      const res = await apiClient.get('/staff');
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.staff ?? raw.data ?? [];
      setStaffOptions(
        arr.map((s: Record<string, unknown>) => ({
          id: (s._id as string) ?? (s.id as string),
          name: `${(s.firstName as string) ?? ''} ${(s.lastName as string) ?? ''}`.trim()
            || ((s.email as string) ?? ''),
        })),
      );
    } catch {
      console.error('Failed to load staff');
    }
  }, []);

  /* ── Registrations ── */
  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await apiClient.get('/after-care/registrations', { params: { schoolId } });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.registrations ?? raw.data ?? [];
      setRegistrations(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load registrations';
      toast.error(msg);
    }
  }, [schoolId]);

  const createRegistration = async (data: {
    studentId: string; term: number; academicYear: number;
    daysPerWeek: string[]; monthlyFee: number;
  }) => {
    await apiClient.post('/after-care/registrations', { ...data, schoolId });
    toast.success('Student registered for After Care');
    await fetchRegistrations();
  };

  const updateRegistration = async (id: string, data: Partial<{
    term: number; academicYear: number; daysPerWeek: string[];
    monthlyFee: number; isActive: boolean;
  }>) => {
    await apiClient.put(`/after-care/registrations/${id}`, data);
    toast.success('Registration updated');
    await fetchRegistrations();
  };

  const deleteRegistration = async (id: string) => {
    await apiClient.delete(`/after-care/registrations/${id}`);
    toast.success('Registration deleted');
    await fetchRegistrations();
  };

  /* ── Attendance ── */
  const fetchAttendance = useCallback(async (date?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (date) params.date = date;
      const res = await apiClient.get('/after-care/attendance', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.attendance ?? raw.data ?? [];
      setAttendance(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load attendance';
      toast.error(msg);
    }
  }, [schoolId]);

  const checkIn = async (data: {
    studentId: string; date: string; checkInTime: string; notes?: string;
  }) => {
    await apiClient.post('/after-care/attendance/check-in', { ...data, schoolId });
    toast.success('Student checked in');
    await fetchAttendance(new Date().toISOString().split('T')[0]);
  };

  const checkOut = async (id: string, checkOutTime: string, notes?: string) => {
    const body: Record<string, string> = { checkOutTime };
    if (notes) body.notes = notes;
    await apiClient.patch(`/after-care/attendance/${id}/check-out`, body);
    toast.success('Student checked out');
    await fetchAttendance(new Date().toISOString().split('T')[0]);
  };

  /* ── Pickup Authorizations ── */
  const fetchPickupAuths = useCallback(async (studentId?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (studentId) params.studentId = studentId;
      const res = await apiClient.get('/after-care/pickup-auth', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.authorizations ?? raw.data ?? [];
      setPickupAuths(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load pickup authorizations';
      toast.error(msg);
    }
  }, [schoolId]);

  const createPickupAuth = async (data: {
    studentId: string; authorizedPersonName: string;
    idNumber: string; relationship: string;
    phoneNumber: string; photoUrl?: string;
  }) => {
    await apiClient.post('/after-care/pickup-auth', { ...data, schoolId });
    toast.success('Pickup authorization added');
    await fetchPickupAuths();
  };

  const updatePickupAuth = async (id: string, data: Partial<{
    authorizedPersonName: string; idNumber: string; relationship: string;
    phoneNumber: string; photoUrl: string; isActive: boolean;
  }>) => {
    await apiClient.put(`/after-care/pickup-auth/${id}`, data);
    toast.success('Pickup authorization updated');
    await fetchPickupAuths();
  };

  const deletePickupAuth = async (id: string) => {
    await apiClient.delete(`/after-care/pickup-auth/${id}`);
    toast.success('Pickup authorization deleted');
    await fetchPickupAuths();
  };

  /* ── Sign-Out Logs ── */
  const fetchSignOutLogs = useCallback(async (date?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (date) params.date = date;
      const res = await apiClient.get('/after-care/sign-out', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.signOutLogs ?? raw.data ?? [];
      setSignOutLogs(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load sign-out logs';
      toast.error(msg);
    }
  }, [schoolId]);

  const createSignOutLog = async (data: {
    attendanceId: string; studentId: string; pickedUpBy: string;
    pickedUpAt: string; isAuthorized: boolean;
    authorizationId?: string; notes?: string;
  }) => {
    await apiClient.post('/after-care/sign-out', { ...data, schoolId });
    toast.success('Sign-out recorded');
    await fetchSignOutLogs();
  };

  /* ── Activities ── */
  const fetchActivities = useCallback(async (date?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (date) params.date = date;
      const res = await apiClient.get('/after-care/activities', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.activities ?? raw.data ?? [];
      setActivities(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load activities';
      toast.error(msg);
    }
  }, [schoolId]);

  const createActivity = async (data: {
    date: string; activityType: string; name: string;
    description?: string; supervisorId: string;
    studentIds: string[]; startTime: string; endTime: string;
  }) => {
    await apiClient.post('/after-care/activities', { ...data, schoolId });
    toast.success('Activity created');
    await fetchActivities();
  };

  const updateActivity = async (id: string, data: Partial<{
    date: string; activityType: string; name: string;
    description: string; supervisorId: string;
    studentIds: string[]; startTime: string; endTime: string;
  }>) => {
    await apiClient.put(`/after-care/activities/${id}`, data);
    toast.success('Activity updated');
    await fetchActivities();
  };

  const deleteActivity = async (id: string) => {
    await apiClient.delete(`/after-care/activities/${id}`);
    toast.success('Activity deleted');
    await fetchActivities();
  };

  /* ── Invoices ── */
  const fetchInvoices = useCallback(async (filters?: {
    month?: number; year?: number; status?: string; studentId?: string;
  }) => {
    try {
      const params: Record<string, string | number> = { schoolId };
      if (filters?.month) params.month = filters.month;
      if (filters?.year) params.year = filters.year;
      if (filters?.status) params.status = filters.status;
      if (filters?.studentId) params.studentId = filters.studentId;
      const res = await apiClient.get('/after-care/invoices', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.invoices ?? raw.data ?? [];
      setInvoices(arr.map(mapId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load invoices';
      toast.error(msg);
    }
  }, [schoolId]);

  const generateInvoices = async (month: number, year: number) => {
    const res = await apiClient.post('/after-care/invoices/generate', { schoolId, month, year });
    const raw = unwrapResponse(res);
    const count = Array.isArray(raw) ? raw.length : 0;
    toast.success(`Generated ${count} invoice(s)`);
    await fetchInvoices();
  };

  const markInvoicePaid = async (id: string) => {
    await apiClient.patch(`/after-care/invoices/${id}/paid`);
    toast.success('Invoice marked as paid');
    await fetchInvoices();
  };

  /* ── Initial load ── */
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      fetchStudents(), fetchRegistrations(), fetchAttendance(today),
      fetchPickupAuths(), fetchSignOutLogs(), fetchActivities(), fetchInvoices(),
      fetchStaffOptions(),
    ]).finally(() => setLoading(false));
  }, [schoolId, fetchStudents, fetchRegistrations, fetchAttendance,
      fetchPickupAuths, fetchSignOutLogs, fetchActivities, fetchInvoices,
      fetchStaffOptions]);

  return {
    registrations, attendance, pickupAuths, signOutLogs, activities, invoices,
    students, staffOptions, loading,
    fetchRegistrations, createRegistration, updateRegistration, deleteRegistration,
    fetchAttendance, checkIn, checkOut,
    fetchPickupAuths, createPickupAuth, updatePickupAuth, deletePickupAuth,
    fetchSignOutLogs, createSignOutLog,
    fetchActivities, createActivity, updateActivity, deleteActivity,
    fetchInvoices, generateInvoices, markInvoicePaid,
  };
}
