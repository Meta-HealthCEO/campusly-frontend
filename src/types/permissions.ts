// ============================================================
// Permission Types
// ============================================================

export interface UserPermissions {
  isSchoolPrincipal: boolean;
  isHOD: boolean;
  departmentId: string | null;
  isBursar: boolean;
  isReceptionist: boolean;
  isCounselor: boolean;
}

export interface PermissionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'school_admin' | 'teacher';
  isActive: boolean;
  isSchoolPrincipal: boolean;
  isHOD: boolean;
  departmentId: { id: string; name: string } | null;
  isBursar: boolean;
  isReceptionist: boolean;
  isCounselor: boolean;
}

export interface UpdatePermissionsPayload {
  isSchoolPrincipal?: boolean;
  isHOD?: boolean;
  departmentId?: string | null;
  isBursar?: boolean;
  isReceptionist?: boolean;
  isCounselor?: boolean;
}

export interface PermissionAuditEntry {
  id: string;
  userId: { id: string; firstName: string; lastName: string; email: string };
  action: string;
  entity: string;
  entityId: string;
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  createdAt: string;
}

export type PermissionFlag = keyof UserPermissions;
