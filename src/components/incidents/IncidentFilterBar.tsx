'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { IncidentStatus, IncidentType, SeverityLevel } from '@/types';

interface IncidentFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  severity: string;
  onSeverityChange: (val: string) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'reported', label: 'Reported' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'injury', label: 'Injury' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'substance', label: 'Substance' },
  { value: 'theft', label: 'Theft' },
  { value: 'verbal_abuse', label: 'Verbal Abuse' },
  { value: 'cyber_bullying', label: 'Cyber Bullying' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function IncidentFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  type, onTypeChange,
  severity, onSeverityChange,
}: IncidentFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search incidents..."
          className="pl-9 w-full"
        />
      </div>
      <Select value={status} onValueChange={(v: string | null) => onStatusChange(v ?? 'all')}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={(v: string | null) => onTypeChange(v ?? 'all')}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severity} onValueChange={(v: string | null) => onSeverityChange(v ?? 'all')}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SEVERITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
