'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface AuditChangesExpanderProps {
  changes: AuditChange[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function AuditChangesExpander({ changes }: AuditChangesExpanderProps) {
  const [expanded, setExpanded] = useState(false);

  if (changes.length === 0 && !expanded) {
    return (
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setExpanded(true)}
        className="text-muted-foreground"
      >
        <ChevronRight className="mr-1 h-3 w-3" />
        No changes
      </Button>
    );
  }

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setExpanded(true)}
      >
        <ChevronRight className="mr-1 h-3 w-3" />
        {changes.length} change{changes.length !== 1 ? 's' : ''}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown className="mr-1 h-3 w-3" />
        Hide changes
      </Button>
      {changes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-2">
          No field-level changes recorded
        </p>
      ) : (
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Field</TableHead>
                <TableHead className="text-xs">Old Value</TableHead>
                <TableHead className="text-xs">New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, idx) => (
                <TableRow key={`${change.field}-${idx}`}>
                  <TableCell className="text-xs font-medium">
                    {change.field}
                  </TableCell>
                  <TableCell className="text-xs text-red-600 dark:text-red-400">
                    {formatValue(change.oldValue)}
                  </TableCell>
                  <TableCell className="text-xs text-emerald-600 dark:text-emerald-400">
                    {formatValue(change.newValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
