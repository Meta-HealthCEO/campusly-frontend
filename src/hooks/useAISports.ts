'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AIPerformanceReport,
  TalentFlag,
  TalentFlagStatus,
} from '@/types/ai-sports';

export function useAISports() {
  const [reports, setReports] = useState<AIPerformanceReport[]>([]);
  const [currentReport, setCurrentReport] = useState<AIPerformanceReport | null>(null);
  const [talentFlags, setTalentFlags] = useState<TalentFlag[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Report generation helpers ---

  const generatePlayerAnalysis = useCallback(async (studentId: string, sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/player/${studentId}/analysis`, { sportCode });
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Player analysis generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateDevelopmentPlan = useCallback(async (studentId: string, sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/player/${studentId}/development-plan`, { sportCode });
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Development plan generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateScoutingReport = useCallback(async (studentId: string, sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/player/${studentId}/scouting-report`, { sportCode });
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Scouting report generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateParentReport = useCallback(async (studentId: string, sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/player/${studentId}/parent-report`, { sportCode });
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Parent report generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateMatchReport = useCallback(async (fixtureId: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/match/${fixtureId}/report`);
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Match report generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateTeamAnalysis = useCallback(async (teamId: string, sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post(`/sports/ai/team/${teamId}/analysis`, { sportCode });
      const report = unwrapResponse<AIPerformanceReport>(res);
      toast.success('Team analysis generated');
      return report;
    } finally {
      setGenerating(false);
    }
  }, []);

  // --- Talent identification ---

  const runTalentIdentification = useCallback(async (sportCode: string) => {
    try {
      setGenerating(true);
      const res = await apiClient.post('/sports/ai/talent-identification', { sportCode });
      const flags = unwrapList<TalentFlag>(res);
      setTalentFlags(flags);
      toast.success('Talent identification complete');
      return flags;
    } finally {
      setGenerating(false);
    }
  }, []);

  const loadTalentFlags = useCallback(async (sportCode?: string, status?: TalentFlagStatus) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (sportCode) params.sportCode = sportCode;
      if (status) params.status = status;
      const res = await apiClient.get('/sports/ai/talent-flags', { params });
      setTalentFlags(unwrapList<TalentFlag>(res));
    } catch (err: unknown) {
      console.error('Failed to load talent flags', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewTalentFlag = useCallback(async (id: string, status: TalentFlagStatus) => {
    await apiClient.patch(`/sports/ai/talent-flags/${id}`, { status });
    setTalentFlags((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    toast.success(`Talent flag ${status}`);
  }, []);

  // --- Reports listing ---

  const loadReports = useCallback(async (studentId?: string, sportCode?: string, reportType?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (studentId) params.studentId = studentId;
      if (sportCode) params.sportCode = sportCode;
      if (reportType) params.reportType = reportType;
      const res = await apiClient.get('/sports/ai/reports', { params });
      setReports(unwrapList<AIPerformanceReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load AI reports', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/ai/reports/${id}`);
      const report = unwrapResponse<AIPerformanceReport>(res);
      setCurrentReport(report);
      return report;
    } catch (err: unknown) {
      console.error('Failed to load report', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports, currentReport, talentFlags, generating, loading,
    generatePlayerAnalysis, generateDevelopmentPlan, generateScoutingReport,
    generateParentReport, generateMatchReport, generateTeamAnalysis,
    runTalentIdentification, loadTalentFlags, reviewTalentFlag,
    loadReports, loadReport,
  };
}
