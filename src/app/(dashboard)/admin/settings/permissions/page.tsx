'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PermissionFilterBar,
  PermissionUserTable,
  PermissionEditDialog,
  PermissionAuditTable,
} from '@/components/permissions';
import { Shield, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import type { PermissionUser, UpdatePermissionsPayload } from '@/types';
import { useSubjects } from '@/hooks/useAcademics';

export default function PermissionsPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    users, loading, fetchUsers,
    updatePermissions,
    auditLogs, auditLoading, fetchAuditLogs,
  } = usePermissions();

  const { subjects } = useSubjects();

  // ─── Filters ───────────────────────────────────────────────────────
  const [role, setRole] = useState('all');
  const [permissionFlag, setPermissionFlag] = useState('all');
  const [search, setSearch] = useState('');

  // ─── Edit dialog ───────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<PermissionUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Active tab ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string | number>('staff');

  // ─── Fetch staff on mount / filter change ──────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    fetchUsers(schoolId, {
      role: role === 'all' ? undefined : role,
      permissionFlag: permissionFlag === 'all' ? undefined : permissionFlag,
      search: search || undefined,
    });
  }, [schoolId, role, permissionFlag, search, fetchUsers]);

  // ─── Fetch audit when tab switches ─────────────────────────────────
  useEffect(() => {
    if (activeTab === 'audit' && schoolId) {
      fetchAuditLogs(schoolId);
    }
  }, [activeTab, schoolId, fetchAuditLogs]);

  const handleEdit = useCallback((u: PermissionUser) => {
    setEditUser(u);
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async (userId: string, payload: UpdatePermissionsPayload) => {
    setSaving(true);
    try {
      await updatePermissions(userId, payload);
      toast.success('Permissions updated successfully');
      setEditOpen(false);
      if (schoolId) fetchUsers(schoolId, {
        role: role === 'all' ? undefined : role,
        permissionFlag: permissionFlag === 'all' ? undefined : permissionFlag,
        search: search || undefined,
      });
    } catch (err: unknown) {
      toast.error('Failed to update permissions');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [updatePermissions, schoolId, role, permissionFlag, search, fetchUsers]);

  const departments = subjects.map((s: { id: string; name: string }) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Permissions"
        description="Manage special role assignments for admin and teaching staff"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff">Staff Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4 mt-4">
          <PermissionFilterBar
            role={role}
            onRoleChange={setRole}
            permissionFlag={permissionFlag}
            onPermissionFlagChange={setPermissionFlag}
            search={search}
            onSearchChange={setSearch}
          />

          {loading ? (
            <LoadingSpinner />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No staff found"
              description="No staff members match your current filters."
            />
          ) : (
            <PermissionUserTable users={users} onEdit={handleEdit} />
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 mt-4">
          {auditLoading ? (
            <LoadingSpinner />
          ) : auditLogs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit history"
              description="Permission changes will appear here once they are made."
            />
          ) : (
            <PermissionAuditTable logs={auditLogs} />
          )}
        </TabsContent>
      </Tabs>

      <PermissionEditDialog
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
        departments={departments}
        saving={saving}
      />
    </div>
  );
}
