import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Student, StudentGrade, Invoice, Attendance } from '@/types';

interface StudentProfile {
  student: Student | null;
  grades: StudentGrade[];
  invoices: Invoice[];
  attendance: Attendance[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function normalize(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, id: (data._id as string) ?? (data.id as string) };
}

export function useStudentProfile(id: string): StudentProfile {
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/students/${id}`);
      const raw = unwrapResponse(res);
      const s = normalize(raw) as unknown as Student;
      setStudent(s);

      // Fetch related data in parallel
      const [gradesRes, invoicesRes, attendanceRes] = await Promise.allSettled([
        apiClient.get(`/academic/marks/student/${id}`),
        apiClient.get(`/fees/invoices/school/${(s.schoolId as string) ?? ''}`),
        apiClient.get(`/attendance/student/${id}`),
      ]);

      if (gradesRes.status === 'fulfilled') {
        const gRaw = unwrapResponse(gradesRes.value);
        const arr = Array.isArray(gRaw) ? gRaw : gRaw.marks ?? gRaw.data ?? [];
        setGrades(arr.map((g: Record<string, unknown>) => normalize(g) as unknown as StudentGrade));
      }

      if (invoicesRes.status === 'fulfilled') {
        const iRaw = unwrapResponse(invoicesRes.value);
        const allInvoices = Array.isArray(iRaw) ? iRaw : iRaw.invoices ?? iRaw.data ?? [];
        const studentInvoices = allInvoices.filter(
          (inv: Record<string, unknown>) => (inv.studentId as string) === id
        );
        setInvoices(studentInvoices.map((i: Record<string, unknown>) => normalize(i) as unknown as Invoice));
      }

      if (attendanceRes.status === 'fulfilled') {
        const aRaw = unwrapResponse(attendanceRes.value);
        const arr = Array.isArray(aRaw) ? aRaw : aRaw.attendance ?? aRaw.data ?? [];
        setAttendance(arr.map((a: Record<string, unknown>) => normalize(a) as unknown as Attendance));
      }
    } catch {
      setError('Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { student, grades, invoices, attendance, loading, error, refetch: fetchProfile };
}

export async function deleteStudent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.delete(`/students/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete student';
    return { success: false, error: message };
  }
}

export async function updateStudent(id: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.put(`/students/${id}`, data);
    return { success: true };
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update student';
    return { success: false, error: message };
  }
}

export async function updateMedicalProfile(
  id: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.patch(`/students/${id}/medical`, data);
    return { success: true };
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update medical profile';
    return { success: false, error: message };
  }
}
