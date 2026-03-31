'use client';

import { useState } from 'react';
import { Pencil, Trash2, Eye, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConsentTypeBadge } from '@/components/consent/ConsentTypeBadge';
import { CreateConsentFormDialog } from '@/components/consent/CreateConsentFormDialog';
import { EditConsentFormDialog } from '@/components/consent/EditConsentFormDialog';
import { DeleteConsentFormDialog } from '@/components/consent/DeleteConsentFormDialog';
import { ConsentResponsesPanel } from '@/components/consent/ConsentResponsesPanel';
import { ConsentFormFilter } from './ConsentFormFilter';
import { useConsentForms } from '@/hooks/useConsent';
import { formatDate } from '@/lib/utils';
import type { ApiConsentForm } from '@/components/consent/types';

function getCreatorName(form: ApiConsentForm): string {
  if (typeof form.createdBy === 'object' && form.createdBy !== null) {
    return `${form.createdBy.firstName} ${form.createdBy.lastName}`;
  }
  return String(form.createdBy ?? '');
}

export default function AdminConsentPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const { forms, loading, refetch: fetchForms, schoolId, userId } = useConsentForms(typeFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState<ApiConsentForm | null>(null);
  const [deleteForm, setDeleteForm] = useState<ApiConsentForm | null>(null);
  const [viewForm, setViewForm] = useState<ApiConsentForm | null>(null);

  const columns: ColumnDef<ApiConsentForm>[] = [
    { accessorKey: 'title', header: 'Title' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <ConsentTypeBadge type={row.original.type} />,
    },
    {
      id: 'students',
      header: 'Students',
      cell: ({ row }) => row.original.targetStudents.length || 'All',
    },
    {
      id: 'expiry',
      header: 'Expiry Date',
      cell: ({ row }) =>
        row.original.expiryDate ? formatDate(row.original.expiryDate) : '-',
    },
    {
      id: 'createdBy',
      header: 'Created By',
      cell: ({ row }) => getCreatorName(row.original),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewForm(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditForm(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteForm(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const totalForms = forms.length;
  const typeCounts = forms.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] ?? 0) + 1;
    return acc;
  }, {});
  const expiredCount = forms.filter(
    (f) => f.expiryDate && new Date(f.expiryDate) < new Date(),
  ).length;
  const activeCount = totalForms - expiredCount;

  if (loading) return <LoadingSpinner />;

  if (viewForm) {
    return (
      <div className="space-y-6">
        <ConsentResponsesPanel form={viewForm} onBack={() => setViewForm(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Management"
        description="Create and manage consent forms for parents to sign."
      >
        <CreateConsentFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          schoolId={schoolId}
          userId={userId}
          onSuccess={fetchForms}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Forms" value={String(totalForms)} icon={FileText} />
        <StatCard title="Active" value={String(activeCount)} icon={CheckCircle2} />
        <StatCard title="Expired" value={String(expiredCount)} icon={Clock} />
        <StatCard
          title="Most Common"
          value={
            Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '-'
          }
          icon={XCircle}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Consent Forms</h2>
        <ConsentFormFilter value={typeFilter} onChange={setTypeFilter} />
      </div>

      <DataTable
        columns={columns}
        data={forms}
        searchKey="title"
        searchPlaceholder="Search consent forms..."
      />

      <EditConsentFormDialog
        open={!!editForm}
        onOpenChange={(v) => { if (!v) setEditForm(null); }}
        form={editForm}
        onSuccess={fetchForms}
      />

      <DeleteConsentFormDialog
        open={!!deleteForm}
        onOpenChange={(v) => { if (!v) setDeleteForm(null); }}
        form={deleteForm}
        onSuccess={fetchForms}
      />
    </div>
  );
}
