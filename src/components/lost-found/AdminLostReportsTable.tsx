'use client';

import { Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import type { LostReport } from '@/types';
import { categoryLabels, categoryStyles, lostStatusStyles } from './shared-styles';
import { MatchSuggestionsPanel } from './MatchSuggestionsPanel';
import type { MatchSuggestion } from '@/hooks/useLostFound';

interface AdminLostReportsTableProps {
  reports: LostReport[];
  onMatch: (lostId: string, foundId: string) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  fetchSuggestions: (itemId: string) => Promise<MatchSuggestion[]>;
}

export function AdminLostReportsTable({
  reports, onMatch, onDelete, fetchSuggestions,
}: AdminLostReportsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const reportToDelete = reports.find((r) => r.id === deleteId);
  const openReports = reports.filter((r) => r.status === 'open');

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete report.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<LostReport>[] = [
    {
      accessorKey: 'itemName',
      header: 'Item Name',
      cell: ({ row }) => <span className="font-medium">{row.original.itemName}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }) => (
        <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>
          {categoryLabels[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    { accessorKey: 'studentName', header: 'Student' },
    {
      accessorKey: 'dateLost',
      header: 'Date Lost',
      cell: ({ row }) => formatDate(row.original.dateLost),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant="secondary" className={lostStatusStyles[row.original.status] ?? ''}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    { accessorKey: 'parentName', header: 'Reported By' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="flex gap-1">
            {report.status === 'open' && (
              <Button size="xs" variant="outline" onClick={() => {
                const el = document.getElementById(`suggestions-${report.id}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Sparkles className="mr-1 h-3 w-3" />
                Find Match
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => setDeleteId(report.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={reports}
        searchKey="itemName"
        searchPlaceholder="Search lost reports..."
      />
      {openReports.map((report) => (
        <div key={report.id} id={`suggestions-${report.id}`}>
          <MatchSuggestionsPanel
            report={report}
            fetchSuggestions={fetchSuggestions}
            onMatch={onMatch}
          />
        </div>
      ))}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the report for &ldquo;{reportToDelete?.itemName}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
