'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  PrincipalKPIs,
  SchoolBenchmark,
  TermTrendData,
  SubjectHeatmapEntry,
  TeacherPerformanceEntry,
  FinancialHealth,
  RiskAlertResponse,
} from '@/types';

export interface PrincipalDashboardState {
  kpis: PrincipalKPIs | null;
  benchmarks: SchoolBenchmark | null;
  trends: TermTrendData | null;
  subjectHeatmap: SubjectHeatmapEntry[];
  teacherPerformance: TeacherPerformanceEntry[];
  financialHealth: FinancialHealth | null;
  riskAlerts: RiskAlertResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePrincipalDashboard() {
  const [kpis, setKpis] = useState<PrincipalKPIs | null>(null);
  const [benchmarks, setBenchmarks] = useState<SchoolBenchmark | null>(null);
  const [trends, setTrends] = useState<TermTrendData | null>(null);
  const [subjectHeatmap, setSubjectHeatmap] = useState<SubjectHeatmapEntry[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformanceEntry[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth | null>(null);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = useCallback(async (term?: number, year?: number) => {
    try {
      const params: Record<string, string> = {};
      if (term) params.term = String(term);
      if (year) params.year = String(year);
      const res = await apiClient.get('/reports/principal/kpis', { params });
      const data = unwrapResponse(res) as PrincipalKPIs;
      setKpis(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch principal KPIs', err);
      return null;
    }
  }, []);

  const fetchBenchmarks = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/principal/benchmarks');
      const data = unwrapResponse(res) as SchoolBenchmark | null;
      setBenchmarks(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch benchmarks', err);
      return null;
    }
  }, []);

  const fetchTrends = useCallback(async (year?: number) => {
    try {
      const params: Record<string, string> = {};
      if (year) params.year = String(year);
      const res = await apiClient.get('/reports/principal/trends', { params });
      const data = unwrapResponse(res) as TermTrendData;
      setTrends(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch term trends', err);
      return null;
    }
  }, []);

  const fetchSubjectHeatmap = useCallback(async (term?: number, year?: number) => {
    try {
      const params: Record<string, string> = {};
      if (term) params.term = String(term);
      if (year) params.year = String(year);
      const res = await apiClient.get('/reports/principal/subject-heatmap', { params });
      const data = unwrapResponse(res) as SubjectHeatmapEntry[];
      const arr = Array.isArray(data) ? data : [];
      setSubjectHeatmap(arr);
      return arr;
    } catch (err: unknown) {
      console.error('Failed to fetch subject heatmap', err);
      return [];
    }
  }, []);

  const fetchTeacherPerformance = useCallback(async (term?: number, year?: number) => {
    try {
      const params: Record<string, string> = {};
      if (term) params.term = String(term);
      if (year) params.year = String(year);
      const res = await apiClient.get('/reports/principal/teacher-performance', { params });
      const data = unwrapResponse(res) as TeacherPerformanceEntry[];
      const arr = Array.isArray(data) ? data : [];
      setTeacherPerformance(arr);
      return arr;
    } catch (err: unknown) {
      console.error('Failed to fetch teacher performance', err);
      return [];
    }
  }, []);

  const fetchFinancialHealth = useCallback(async (year?: number) => {
    try {
      const params: Record<string, string> = {};
      if (year) params.year = String(year);
      const res = await apiClient.get('/reports/principal/financial-health', { params });
      const data = unwrapResponse(res) as FinancialHealth;
      setFinancialHealth(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch financial health', err);
      return null;
    }
  }, []);

  const fetchRiskAlerts = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/principal/risk-alerts');
      const data = unwrapResponse(res) as RiskAlertResponse;
      setRiskAlerts(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch risk alerts', err);
      return null;
    }
  }, []);

  const fetchAll = useCallback(async (term?: number, year?: number) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchKpis(term, year),
        fetchBenchmarks(),
        fetchTrends(year),
        fetchSubjectHeatmap(term, year),
        fetchTeacherPerformance(term, year),
        fetchFinancialHealth(year),
        fetchRiskAlerts(),
      ]);
    } catch (err: unknown) {
      setError('Failed to load principal dashboard data');
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [fetchKpis, fetchBenchmarks, fetchTrends, fetchSubjectHeatmap, fetchTeacherPerformance, fetchFinancialHealth, fetchRiskAlerts]);

  return {
    kpis,
    benchmarks,
    trends,
    subjectHeatmap,
    teacherPerformance,
    financialHealth,
    riskAlerts,
    loading,
    error,
    fetchAll,
    fetchKpis,
    fetchBenchmarks,
    fetchTrends,
    fetchSubjectHeatmap,
    fetchTeacherPerformance,
    fetchFinancialHealth,
    fetchRiskAlerts,
  };
}
