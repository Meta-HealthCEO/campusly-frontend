'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FileText, Trash2, Copy } from 'lucide-react';
import type { HomeworkTemplate } from '@/types';

interface TemplateSelectorProps {
  templates: HomeworkTemplate[];
  onSelect: (template: HomeworkTemplate) => void;
  onDelete: (templateId: string) => Promise<boolean>;
}

export function TemplateSelector({ templates, onSelect, onDelete }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HomeworkTemplate | null>(null);

  const handleSelect = (template: HomeworkTemplate) => {
    onSelect(template);
    setOpen(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      const ok = await onDelete(pendingDelete.id);
      if (!ok) throw new Error('delete-failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Copy className="mr-2 h-4 w-4" />
            From Template
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Templates"
              description="Save a homework as template to reuse it later."
            />
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.subject?.name && (
                        <Badge variant="secondary" className="text-xs">{t.subject.name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{t.totalMarks} marks</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(t);
                    }}
                    disabled={deletingId === t.id}
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title="Delete template"
        description={
          pendingDelete
            ? `Are you sure you want to delete the "${pendingDelete.title}" template? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </Dialog>
  );
}
