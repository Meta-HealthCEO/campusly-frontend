'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DepartmentSelector } from './DepartmentSelector';
import type { PermissionUser, UpdatePermissionsPayload } from '@/types';

interface Department {
  id: string;
  name: string;
}

interface PermissionEditDialogProps {
  user: PermissionUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, payload: UpdatePermissionsPayload) => Promise<void>;
  departments: Department[];
  saving?: boolean;
}

export function PermissionEditDialog({
  user,
  open,
  onOpenChange,
  onSave,
  departments,
  saving = false,
}: PermissionEditDialogProps) {
  const [isSchoolPrincipal, setIsSchoolPrincipal] = useState(false);
  const [isHOD, setIsHOD] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [isBursar, setIsBursar] = useState(false);
  const [isReceptionist, setIsReceptionist] = useState(false);
  const [isCounselor, setIsCounselor] = useState(false);

  useEffect(() => {
    if (open && user) {
      setIsSchoolPrincipal(user.isSchoolPrincipal);
      setIsHOD(user.isHOD);
      setDepartmentId(user.departmentId?.id ?? null);
      setIsBursar(user.isBursar);
      setIsReceptionist(user.isReceptionist);
      setIsCounselor(user.isCounselor);
    }
  }, [open, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const payload: UpdatePermissionsPayload = {};
    if (user.role === 'school_admin') {
      payload.isSchoolPrincipal = isSchoolPrincipal;
      payload.isBursar = isBursar;
      payload.isReceptionist = isReceptionist;
    }
    if (user.role === 'teacher') {
      payload.isHOD = isHOD;
      payload.departmentId = isHOD ? departmentId : null;
      payload.isCounselor = isCounselor;
    }
    await onSave(user.id, payload);
  }, [user, isSchoolPrincipal, isBursar, isReceptionist, isHOD, departmentId, isCounselor, onSave]);

  if (!user) return null;

  const isAdmin = user.role === 'school_admin';
  const isTeacher = user.role === 'teacher';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            {user.firstName} {user.lastName} &middot;{' '}
            <Badge variant="secondary" className="ml-1">
              {isAdmin ? 'Admin' : 'Teacher'}
            </Badge>
          </DialogDescription>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {isAdmin && (
            <>
              <ToggleRow
                label="School Principal"
                description="Full oversight of all school operations"
                checked={isSchoolPrincipal}
                onCheckedChange={setIsSchoolPrincipal}
              />
              <ToggleRow
                label="Bursar"
                description="Access to financial management and reporting"
                checked={isBursar}
                onCheckedChange={setIsBursar}
              />
              <ToggleRow
                label="Receptionist"
                description="Visitor management and front-desk functions"
                checked={isReceptionist}
                onCheckedChange={setIsReceptionist}
              />
            </>
          )}
          {isTeacher && (
            <>
              <ToggleRow
                label="Head of Department (HOD)"
                description="Oversight of a subject department"
                checked={isHOD}
                onCheckedChange={setIsHOD}
              />
              {isHOD && (
                <DepartmentSelector
                  value={departmentId}
                  onChange={setDepartmentId}
                  departments={departments}
                />
              )}
              <ToggleRow
                label="Counselor"
                description="Access to pastoral care and student well-being"
                checked={isCounselor}
                onCheckedChange={setIsCounselor}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Internal helper ─────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
