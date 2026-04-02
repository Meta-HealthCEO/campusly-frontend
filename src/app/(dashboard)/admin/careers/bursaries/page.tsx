'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { DollarSign, Plus, Upload, Pencil } from 'lucide-react';
import { useBursaries } from '@/hooks/useBursaries';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BursaryForm } from '@/components/careers/BursaryForm';
import { CSVImportDialog } from '@/components/careers/CSVImportDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Bursary } from '@/types';
import type { BursaryFormData } from '@/lib/validations/careers';

function formatZAR(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminBursariesPage() {
  const {
    bursaries,
    loading,
    createBursary,
    updateBursary,
    importBursaries,
  } = useBursaries();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingBursary, setEditingBursary] = useState<Bursary | null>(null);

  const handleCreate = useCallback(
    async (data: BursaryFormData) => {
      try {
        await createBursary(data as Record<string, unknown>);
        toast.success('Bursary created successfully');
        setFormOpen(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create bursary';
        toast.error(message);
      }
    },
    [createBursary],
  );

  const handleUpdate = useCallback(
    async (data: BursaryFormData) => {
      if (!editingBursary) return;
      try {
        await updateBursary(editingBursary.id, data as Record<string, unknown>);
        toast.success('Bursary updated successfully');
        setEditingBursary(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update bursary';
        toast.error(message);
      }
    },
    [editingBursary, updateBursary],
  );

  const handleImport = useCallback(
    async (file: File) => {
      const result = await importBursaries(file);
      toast.success(`Imported ${result.imported} bursaries (${result.skipped} skipped)`);
      setImportOpen(false);
      return result;
    },
    [importBursaries],
  );

  const handleEditClick = useCallback((bursary: Bursary) => {
    setEditingBursary(bursary);
  }, []);

  const columns = useMemo<ColumnDef<Bursary, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium truncate block max-w-[200px]">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: 'provider',
        header: 'Provider',
        cell: ({ row }) => (
          <span className="truncate block max-w-[160px]">{row.original.provider}</span>
        ),
      },
      {
        accessorKey: 'minimumAPS',
        header: 'Min APS',
        cell: ({ row }) => row.original.minimumAPS ?? '—',
      },
      {
        accessorKey: 'fieldOfStudy',
        header: 'Fields',
        cell: ({ row }) => {
          const fields = row.original.fieldOfStudy;
          if (!fields || fields.length === 0) return '—';
          const visible = fields.slice(0, 2);
          const remaining = fields.length - 2;
          return (
            <div className="flex flex-wrap gap-1">
              {visible.map((field: string) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
              {remaining > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remaining} more
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'applicationCloseDate',
        header: 'Deadline',
        cell: ({ row }) =>
          row.original.applicationCloseDate
            ? formatDate(row.original.applicationCloseDate)
            : '—',
      },
      {
        accessorKey: 'annualValue',
        header: 'Annual Value',
        cell: ({ row }) =>
          row.original.annualValue != null
            ? formatZAR(row.original.annualValue)
            : '—',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditClick(row.original)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ),
      },
    ],
    [handleEditClick],
  );

  if (loading) {
    return <LoadingSpinner className="mt-12" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bursaries"
        description="Manage bursary and scholarship listings"
      >
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Bursary
        </Button>
      </PageHeader>

      {bursaries.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No bursaries yet"
          description="Add bursaries manually or import them from a CSV file."
        />
      ) : (
        <DataTable columns={columns} data={bursaries} searchKey="name" />
      )}

      <BursaryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      <BursaryForm
        open={!!editingBursary}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingBursary(null);
        }}
        onSubmit={handleUpdate}
        initialData={
          editingBursary
            ? {
                name: editingBursary.name,
                provider: editingBursary.provider,
                description: editingBursary.description,
                eligibilityCriteria: editingBursary.eligibilityCriteria,
                minimumAPS: editingBursary.minimumAPS,
                fieldOfStudy: editingBursary.fieldOfStudy,
                coverageDetails: editingBursary.coverageDetails,
                applicationOpenDate: editingBursary.applicationOpenDate,
                applicationCloseDate: editingBursary.applicationCloseDate,
                applicationUrl: editingBursary.applicationUrl,
                annualValue: editingBursary.annualValue,
              }
            : undefined
        }
        title="Edit Bursary"
      />

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        title="Import Bursaries"
        description="Upload a CSV file with bursary data. Expected columns: name, provider, description, minimumAPS, fieldOfStudy, applicationCloseDate, annualValue."
      />
    </div>
  );
}
