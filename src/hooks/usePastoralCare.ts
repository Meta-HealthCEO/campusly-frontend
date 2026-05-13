import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type {
  StudentWellbeingProfile,
  CounselorCaseload,
  PastoralReport,
  PastoralReports,
  ReportFilters,
} from '@/types/pastoral';

const REPORT_TYPES = ['referral_reasons', 'sessions_monthly', 'outcomes'] as const;

function yearFromFilters(params?: ReportFilters): number | undefined {
  const rawDate = params?.startDate || params?.endDate;
  if (!rawDate) return undefined;
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? undefined : date.getFullYear();
}

export function usePastoralCare() {
  const [wellbeingProfile, setWellbeingProfile] = useState<StudentWellbeingProfile | null>(null);
  const [wellbeingLoading, setWellbeingLoading] = useState(false);

  const [caseload, setCaseload] = useState<CounselorCaseload | null>(null);
  const [caseloadLoading, setCaseloadLoading] = useState(false);

  const [reports, setReports] = useState<PastoralReports>({
    reasons: null,
    sessions: null,
    outcomes: null,
  });
  const [reportLoading, setReportLoading] = useState(false);

  const fetchWellbeing = useCallback(async (studentId: string): Promise<void> => {
    setWellbeingLoading(true);
    try {
      const response = await apiClient.get(`/pastoral/students/${studentId}/wellbeing`);
      setWellbeingProfile(unwrapResponse<StudentWellbeingProfile>(response));
    } catch (err: unknown) {
      console.warn(extractErrorMessage(err, 'Failed to load wellbeing profile'));
      setWellbeingProfile(null);
    } finally {
      setWellbeingLoading(false);
    }
  }, []);

  const fetchCaseload = useCallback(async (): Promise<void> => {
    setCaseloadLoading(true);
    try {
      const response = await apiClient.get('/pastoral/caseload');
      setCaseload(unwrapResponse<CounselorCaseload>(response));
    } catch (err: unknown) {
      console.warn(extractErrorMessage(err, 'Failed to load caseload'));
      setCaseload(null);
    } finally {
      setCaseloadLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (params?: ReportFilters): Promise<void> => {
    setReportLoading(true);
    try {
      const year = yearFromFilters(params);
      const [reasons, sessions, outcomes] = await Promise.all(
        REPORT_TYPES.map(async (reportType) => {
          const response = await apiClient.get('/pastoral/reports', {
            params: { reportType, ...(year ? { year } : {}) },
          });
          return unwrapResponse<PastoralReport>(response);
        }),
      );
      setReports({ reasons, sessions, outcomes });
    } catch (err: unknown) {
      console.warn(extractErrorMessage(err, 'Failed to load pastoral reports'));
      setReports({ reasons: null, sessions: null, outcomes: null });
    } finally {
      setReportLoading(false);
    }
  }, []);

  return {
    wellbeingProfile,
    wellbeingLoading,
    fetchWellbeing,
    caseload,
    caseloadLoading,
    fetchCaseload,
    reports,
    report: reports.reasons,
    reportLoading,
    fetchReport,
  };
}
