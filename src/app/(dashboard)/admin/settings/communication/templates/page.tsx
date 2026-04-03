'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { TemplateList } from '@/components/communication/TemplateList';
import { TemplateFormDialog } from '@/components/communication/TemplateFormDialog';
import { useCommTemplates } from '@/hooks/useCommunicationAdmin';
import { toast } from 'sonner';
import type { CommTemplate, CreateCommTemplatePayload } from '@/types';

export default function TemplateManagerPage() {
  const {
    templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
  } = useCommTemplates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (tpl: CommTemplate) => {
    setEditing(tpl);
    setDialogOpen(true);
  };

  const handleDelete = async (tpl: CommTemplate) => {
    if (!confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      await deleteTemplate(tpl.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSubmit = async (data: CreateCommTemplatePayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, data);
      } else {
        await createTemplate(data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Message Templates" description="Create and manage reusable message templates">
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create your first message template to get started."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          }
        />
      ) : (
        <TemplateList templates={templates} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
