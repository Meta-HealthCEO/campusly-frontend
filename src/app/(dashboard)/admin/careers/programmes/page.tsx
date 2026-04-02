'use client';

import { useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import type { Programme } from '@/types/careers';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useUniversities } from '@/hooks/useUniversities';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ProgrammeForm } from '@/components/careers/ProgrammeForm';
import { CSVImportDialog } from '@/components/careers/CSVImportDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const qualificationLabels: Record<Programme['qualificationType'], string> = {
  bachelor: 'Bachelor',
  diploma: 'Diploma',
  higher_certificate: 'Higher Certificate',
  postgrad_diploma: 'Postgrad Diploma',
};

const columns: ColumnDef<Programme>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{row.getValue<string>('name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'universityName',
    header: 'University',
    cell: ({ row }) => (
      <span className="truncate">{row.getValue<string>('universityName')}</span>
    ),
  },
  {
    accessorKey: 'faculty',
    header: 'Faculty',
    cell: ({ row }) => (
      <span className="truncate">{row.getValue<string>('faculty')}</span>
    ),
  },
  {
    accessorKey: 'qualificationType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue<Programme['qualificationType']>('qualificationType');
      return <Badge variant="secondary">{qualificationLabels[type] ?? type}</Badge>;
    },
  },
  {
    accessorKey: 'minimumAPS',
    header: 'Min APS',
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
  },
];

export default function ProgrammesPage() {
  const {
    programmes,
    loading,
    refetch,
    createProgramme,
    updateProgramme,
    importProgrammes,
  } = useProgrammes();
  const { universities } = useUniversities();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);

  const handleCreate = useCallback(async (data: Partial<Programme>) => {
    try {
      await createProgramme(data);
      toast.success('Programme created successfully');
      setFormOpen(false);
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create programme';
      toast.error(message);
    }
  }, [createProgramme, refetch]);

  const handleUpdate = useCallback(async (data: Partial<Programme>) => {
    if (!editingProgramme) return;
    try {
      await updateProgramme(editingProgramme.id, data);
      toast.success('Programme updated successfully');
      setEditingProgramme(null);
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update programme';
      toast.error(message);
    }
  }, [editingProgramme, updateProgramme, refetch]);

  const handleImport = useCallback(async (file: File) => {
    const result = await importProgrammes(file);
    toast.success('Programmes imported successfully');
    setImportOpen(false);
    refetch();
    return result;
  }, [importProgrammes, refetch]);

  const handleEdit = useCallback((programme: Programme) => {
    setEditingProgramme(programme);
  }, []);

  const columnsWithActions: ColumnDef<Programme>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(row.original)}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Programmes" description="Manage university programmes and qualifications">
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Programme
        </Button>
      </PageHeader>

      {programmes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No programmes yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first programme or import from CSV to get started.
          </p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Programme
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columnsWithActions}
          data={programmes}
          searchKey="name"
          searchPlaceholder="Search programmes..."
        />
      )}

      <ProgrammeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        universities={universities}
        title="Add Programme"
      />

      <ProgrammeForm
        open={!!editingProgramme}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingProgramme(null);
        }}
        onSubmit={handleUpdate}
        universities={universities}
        initialData={editingProgramme ?? undefined}
        title="Edit Programme"
      />

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        title="Import Programmes"
        description="Upload a CSV file with programme data. The file should include columns for name, university, faculty, qualification type, minimum APS, and duration."
      />
    </div>
  );
}
