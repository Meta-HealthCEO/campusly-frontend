'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  Incident, IncidentAction, ConfidentialNote,
  CreateIncidentPayload, UpdateIncidentPayload,
  CreateActionPayload, UpdateActionPayload,
} from '@/types';

interface IncidentListResult {
  items: Incident[];
  total: number;
  page: number;
  limit: number;
}

interface IncidentFilters {
  status?: string;
  type?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actions, setActions] = useState<IncidentAction[]>([]);
  const [notes, setNotes] = useState<ConfidentialNote[]>([]);

  const fetchIncidents = useCallback(async (filters?: IncidentFilters) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.type) params.type = filters.type;
      if (filters?.severity) params.severity = filters.severity;
      if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters?.dateTo) params.dateTo = filters.dateTo;
      if (filters?.search) params.search = filters.search;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const response = await apiClient.get('/incidents', { params });
      const data = unwrapResponse<IncidentListResult>(response);
      setIncidents(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIncident = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/incidents/${id}`);
      const data = unwrapResponse<Incident>(response);
      setSelectedIncident(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch incident', err);
      return null;
    }
  }, []);

  const createIncident = useCallback(async (data: CreateIncidentPayload) => {
    const response = await apiClient.post('/incidents', data);
    toast.success('Incident reported successfully');
    return unwrapResponse<Incident>(response);
  }, []);

  const updateIncident = useCallback(async (id: string, data: UpdateIncidentPayload) => {
    const response = await apiClient.put(`/incidents/${id}`, data);
    toast.success('Incident updated');
    return unwrapResponse<Incident>(response);
  }, []);

  const deleteIncident = useCallback(async (id: string) => {
    await apiClient.delete(`/incidents/${id}`);
    toast.success('Incident deleted');
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────

  const fetchActions = useCallback(async (incidentId: string) => {
    try {
      const response = await apiClient.get(`/incidents/${incidentId}/actions`);
      const data = unwrapList<IncidentAction>(response);
      setActions(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch actions', err);
      return [];
    }
  }, []);

  const createAction = useCallback(async (incidentId: string, data: CreateActionPayload) => {
    const response = await apiClient.post(`/incidents/${incidentId}/actions`, data);
    toast.success('Follow-up action created');
    return unwrapResponse<IncidentAction>(response);
  }, []);

  const updateAction = useCallback(async (
    incidentId: string, actionId: string, data: UpdateActionPayload,
  ) => {
    const response = await apiClient.put(
      `/incidents/${incidentId}/actions/${actionId}`, data,
    );
    toast.success('Action updated');
    return unwrapResponse<IncidentAction>(response);
  }, []);

  // ─── Confidential Notes ────────────────────────────────────────────────

  const fetchNotes = useCallback(async (incidentId: string) => {
    try {
      const response = await apiClient.get(`/incidents/${incidentId}/confidential-notes`);
      const data = unwrapList<ConfidentialNote>(response);
      setNotes(data);
      return data;
    } catch (err: unknown) {
      // Silently fail for non-counselors (403)
      setNotes([]);
      return [];
    }
  }, []);

  const createNote = useCallback(async (incidentId: string, content: string) => {
    const response = await apiClient.post(
      `/incidents/${incidentId}/confidential-notes`, { content },
    );
    toast.success('Confidential note added');
    return unwrapResponse<ConfidentialNote>(response);
  }, []);

  const updateNote = useCallback(async (
    incidentId: string, noteId: string, content: string,
  ) => {
    const response = await apiClient.put(
      `/incidents/${incidentId}/confidential-notes/${noteId}`, { content },
    );
    toast.success('Note updated');
    return unwrapResponse<ConfidentialNote>(response);
  }, []);

  return {
    incidents, total, loading, selectedIncident, actions, notes,
    fetchIncidents, fetchIncident, createIncident, updateIncident, deleteIncident,
    fetchActions, createAction, updateAction,
    fetchNotes, createNote, updateNote,
    setSelectedIncident,
  };
}
