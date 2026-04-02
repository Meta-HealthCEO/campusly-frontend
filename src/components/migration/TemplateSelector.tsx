'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { useMigrationApi } from '@/hooks/useMigrationApi';
import type { FieldMapping, SourceSystem } from '@/types/migration';
import { SOURCE_SYSTEM_LABELS } from '@/types/migration';
import { FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceSystem: SourceSystem;
  onApply: (mappings: FieldMapping[]) => void;
}

export function TemplateSelector({
  open,
  onOpenChange,
  sourceSystem,
  onApply,
}: TemplateSelectorProps) {
  const { templates, templatesLoading } = useMigrationStore();
  const { fetchTemplates } = useMigrationApi();

  useEffect(() => {
    if (open) {
      fetchTemplates(sourceSystem);
    }
  }, [open, sourceSystem, fetchTemplates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <DialogDescription>
            Select a mapping template for {SOURCE_SYSTEM_LABELS[sourceSystem]} imports.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {templatesLoading ? (
            <LoadingSpinner size="sm" />
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No templates available for this source system.
            </p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  onApply(template.fieldMappings);
                  onOpenChange(false);
                }}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">
                    {template.entityType} Template
                    {template.isDefault && (
                      <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {template.fieldMappings.length} field mappings
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
