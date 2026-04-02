'use client';

import { useState, useMemo } from 'react';
import { Building2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { UniversityForm } from '@/components/careers/UniversityForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUniversities } from '@/hooks/useUniversities';
import type { University } from '@/types';
import type { UniversityFormData } from '@/lib/validations/careers';

const TYPE_LABELS: Record<University['type'], string> = {
  traditional: 'Traditional',
  comprehensive: 'Comprehensive',
  university_of_technology: 'University of Technology',
  tvet: 'TVET',
  private: 'Private',
};

export default function AdminUniversitiesPage() {
  const { universities, loading, createUniversity, updateUniversity } = useUniversities();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);

  const handleCreate = () => {
    setEditingUniversity(null);
    setFormOpen(true);
  };

  const handleEdit = (university: University) => {
    setEditingUniversity(university);
    setFormOpen(true);
  };

  const handleSubmit = async (data: UniversityFormData) => {
    try {
      if (editingUniversity) {
        await updateUniversity(editingUniversity.id, data as Record<string, unknown>);
        toast.success('University updated successfully');
      } else {
        await createUniversity(data as Record<string, unknown>);
        toast.success('University created successfully');
      }
      setFormOpen(false);
      setEditingUniversity(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    }
  };

  const columns = useMemo<ColumnDef<University>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'shortName',
        header: 'Short Name',
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="secondary">
            {TYPE_LABELS[row.original.type] ?? row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: 'province',
        header: 'Province',
      },
      {
        accessorKey: 'city',
        header: 'City',
      },
      {
        accessorKey: 'programmeCount',
        header: 'Programmes',
        cell: ({ row }) => row.original.programmeCount ?? 0,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Universities"
        description="Manage universities and institutions available for career guidance"
      >
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add University
        </Button>
      </PageHeader>

      {universities.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No universities"
          description="Add your first university to get started with career guidance."
        />
      ) : (
        <DataTable
          columns={columns}
          data={universities}
          searchKey="name"
          searchPlaceholder="Search universities..."
        />
      )}

      <UniversityForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingUniversity(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingUniversity ?? undefined}
        title={editingUniversity ? 'Edit University' : 'Add University'}
      />
    </div>
  );
}
