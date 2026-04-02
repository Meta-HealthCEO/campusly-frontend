'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';
import type { AuditFilterParams } from '@/stores/useAuditStore';

const ACTION_OPTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'export', label: 'Export' },
] as const;

function toLocalDateInputValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AuditFilterBar() {
  const { filters, setFilter, resetFilters } = useAuditStore();
  const { fetchLogs } = useAuditApi();

  const hasActiveFilters = !!(
    filters.userId ||
    filters.entity ||
    filters.action ||
    filters.startDate ||
    filters.endDate
  );

  const handleActionChange = (val: unknown) => {
    const action = val as AuditFilterParams['action'];
    setFilter({ action });
    fetchLogs();
  };

  const handleEntityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ entity: e.target.value || undefined });
  };

  const handleEntityBlur = () => {
    fetchLogs();
  };

  const handleEntityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') fetchLogs();
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const iso = value ? new Date(value + 'T00:00:00').toISOString() : undefined;
    setFilter({ startDate: iso });
    fetchLogs();
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const iso = value ? new Date(value + 'T23:59:59').toISOString() : undefined;
    setFilter({ endDate: iso });
    fetchLogs();
  };

  const handleClear = () => {
    resetFilters();
    fetchLogs();
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Action</Label>
        <Select
          value={filters.action ?? ''}
          onValueChange={handleActionChange}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Entity</Label>
        <Input
          placeholder="e.g. Student, Fee"
          className="w-[150px]"
          value={filters.entity ?? ''}
          onChange={handleEntityChange}
          onBlur={handleEntityBlur}
          onKeyDown={handleEntityKeyDown}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={toLocalDateInputValue(filters.startDate)}
          onChange={handleStartDateChange}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={toLocalDateInputValue(filters.endDate)}
          onChange={handleEndDateChange}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="mr-1 h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
