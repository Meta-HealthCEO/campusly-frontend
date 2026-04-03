import { useState } from 'react';
import apiClient from '@/lib/api-client';
import type {
  StudentWellbeingProfile,
  CounselorCaseload,
  PastoralReport,
  ReportFilters,
} from '@/types/pastoral';

export function usePastoralCare() {
  const [wellbeingProfile, setWellbeingProfile] = useState<StudentWellbeingProfile | null>(null);
  const [wellbeingLoading, setWellbeingLoading] = useState(false);

  const [caseload, setCaseload] = useState<CounselorCaseload | null>(null);
  const [caseloadLoading, setCaseloadLoading] = useState(false);

  const [report, setReport] = useState<PastoralReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchWellbeing = async (studentId: string): Promise<void> => {
    setWellbeingLoading(true);
    try {
      const response = await apiClient.get(`/pastoral/students/${studentId}/wellbeing`);
      const raw = response.data.data ?? response.data;
      setWellbeingProfile(raw as StudentWellbeingProfile);
    } catch (err: unknown) {
      console.error('Failed to load wellbeing profile', err);
    } finally {
      setWellbeingLoading(false);
    }
  };

  const fetchCaseload = async (): Promise<void> => {
    setCaseloadLoading(true);
    try {
      const response = await apiClient.get('/pastoral/caseload');
      const raw = response.data.data ?? response.data;
      setCaseload(raw as CounselorCaseload);
    } catch (err: unknown) {
      console.error('Failed to load caseload', err);
    } finally {
      setCaseloadLoading(false);
    }
  };

  const fetchReport = async (params?: ReportFilters): Promise<void> => {
    setReportLoading(true);
    try {
      const response = await apiClient.get('/pastoral/reports', { params });
      const raw = response.data.data ?? response.data;
      setReport(raw as PastoralReport);
    } catch (err: unknown) {
      console.error('Failed to load pastoral report', err);
    } finally {
      setReportLoading(false);
    }
  };

  return {
    wellbeingProfile,
    wellbeingLoading,
    fetchWellbeing,
    caseload,
    caseloadLoading,
    fetchCaseload,
    report,
    reportLoading,
    fetchReport,
  };
}
