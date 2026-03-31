'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { TypeBadge, ChannelBadge } from './MessageBadges';
import { TemplateForm } from './TemplateForm';
import type { MessageTemplate, CreateTemplateInput } from './types';

interface TemplateManagerProps {
  templates: MessageTemplate[];
  loading: boolean;
  onCreateTemplate: (data: Omit<CreateTemplateInput, 'schoolId'>) => Promise<MessageTemplate>;
  onUpdateTemplate: (
    id: string,
    data: Partial<Omit<CreateTemplateInput, 'schoolId'>>
  ) => Promise<MessageTemplate>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export function TemplateManager({
  templates, loading, onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
}: TemplateManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditing(template);
    setDialogOpen(true);
  };

  const handleDelete = async (template: MessageTemplate) => {
    try {
      await onDeleteTemplate(template.id);
      toast.success('Template deleted');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete template';
      toast.error(msg);
    }
  };

  const handleSubmit = async (data: Omit<CreateTemplateInput, 'schoolId'>) => {
    setSubmitting(true);
    try {
      if (editing) {
        await onUpdateTemplate(editing.id, data);
        toast.success('Template updated');
      } else {
        await onCreateTemplate(data);
        toast.success('Template created');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (editing ? 'Failed to update template' : 'Failed to create template');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Message Templates</CardTitle>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No templates"
            description="Create message templates to speed up bulk messaging."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell><TypeBadge type={tpl.type} /></TableCell>
                  <TableCell className="max-w-[200px] truncate">{tpl.subject}</TableCell>
                  <TableCell><ChannelBadge channel={tpl.channel} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the template details below.' : 'Create a reusable message template.'}
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
