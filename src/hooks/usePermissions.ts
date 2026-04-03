'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  PermissionUser,
  UpdatePermissionsPayload,
  PermissionAuditEntry,
} from '@/types';

interface FetchParams {
  page?: number;
  limit?: number;
  role?: string;
  permissionFlag?: string;
  search?: string;
}

interface AuditParams {
  page?: number;
  limit?: number;
}

export function usePermissions() {
  // ─── Staff list state ──────────────────────────────────────────────
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // ─── Audit log state ──────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<PermissionAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);

  const fetchUsers = useCallback(async (schoolId: string, params?: FetchParams) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/permissions/school/${schoolId}`, { params });
      const raw = unwrapResponse<{ users?: PermissionUser[]; total?: number; page?: number }>(response);
      const list = Array.isArray(raw)
        ? raw as PermissionUser[]
        : unwrapList<PermissionUser>(response, 'users');
      setUsers(list);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        setTotal(raw.total ?? list.length);
        setPage(raw.page ?? params?.page ?? 1);
      } else {
        setTotal(list.length);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch permission users:', extractErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePermissions = useCallback(async (userId: string, payload: UpdatePermissionsPayload) => {
    const response = await apiClient.put(`/permissions/${userId}`, payload);
    return unwrapResponse<PermissionUser>(response);
  }, []);

  const fetchAuditLogs = useCallback(async (schoolId: string, params?: AuditParams) => {
    setAuditLoading(true);
    try {
      const response = await apiClient.get(`/permissions/audit/${schoolId}`, { params });
      const raw = unwrapResponse<{ logs?: PermissionAuditEntry[]; total?: number }>(response);
      const list = Array.isArray(raw)
        ? raw as PermissionAuditEntry[]
        : unwrapList<PermissionAuditEntry>(response, 'logs');
      setAuditLogs(list);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        setAuditTotal(raw.total ?? list.length);
      } else {
        setAuditTotal(list.length);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch audit logs:', extractErrorMessage(err));
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    total,
    page,
    fetchUsers,
    updatePermissions,
    auditLogs,
    auditLoading,
    auditTotal,
    fetchAuditLogs,
  };
}
