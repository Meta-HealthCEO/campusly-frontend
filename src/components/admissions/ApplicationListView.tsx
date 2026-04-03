'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import type { AdmissionApplication } from '@/types/admissions';

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  applications: AdmissionApplication[];
  onCardClick: (app: AdmissionApplication) => void;
  onBulkAction: (ids: string[], action: 'accepted' | 'rejected') => void;
}

export function ApplicationListView({ applications, onCardClick, onBulkAction }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === applications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(applications.map((a: AdmissionApplication) => a.id || a._id)));
    }
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button size="sm" onClick={() => onBulkAction(selectedIds, 'accepted')}>
            Bulk Accept
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onBulkAction(selectedIds, 'rejected')}>
            Bulk Reject
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left w-10">
                <Checkbox
                  checked={selected.size === applications.length && applications.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="p-2 text-left">Application #</th>
              <th className="p-2 text-left">Applicant</th>
              <th className="p-2 text-left">Grade</th>
              <th className="p-2 text-left">Parent</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app: AdmissionApplication) => {
              const appId = app.id || app._id;
              return (
                <tr
                  key={appId}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => onCardClick(app)}
                >
                  <td className="p-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(appId)}
                      onCheckedChange={() => toggleSelect(appId)}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs truncate">{app.applicationNumber}</td>
                  <td className="p-2 truncate">{app.applicantFirstName} {app.applicantLastName}</td>
                  <td className="p-2">{gradeLabel(app.gradeApplyingFor)}</td>
                  <td className="p-2 truncate">{app.parentFirstName} {app.parentLastName}</td>
                  <td className="p-2"><ApplicationStatusBadge status={app.status} /></td>
                  <td className="p-2 text-muted-foreground">{formatDate(app.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {applications.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No applications found.</p>
      )}
    </div>
  );
}
