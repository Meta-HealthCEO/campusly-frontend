'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface PermissionFilterBarProps {
  role: string;
  onRoleChange: (role: string) => void;
  permissionFlag: string;
  onPermissionFlagChange: (flag: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function PermissionFilterBar({
  role,
  onRoleChange,
  permissionFlag,
  onPermissionFlagChange,
  search,
  onSearchChange,
}: PermissionFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select value={role} onValueChange={(v: unknown) => onRoleChange(v as string)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="school_admin">Admin</SelectItem>
          <SelectItem value="teacher">Teacher</SelectItem>
        </SelectContent>
      </Select>

      <Select value={permissionFlag} onValueChange={(v: unknown) => onPermissionFlagChange(v as string)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Permissions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Permissions</SelectItem>
          <SelectItem value="isSchoolPrincipal">Principal</SelectItem>
          <SelectItem value="isHOD">HOD</SelectItem>
          <SelectItem value="isBursar">Bursar</SelectItem>
          <SelectItem value="isReceptionist">Receptionist</SelectItem>
          <SelectItem value="isCounselor">Counselor</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
