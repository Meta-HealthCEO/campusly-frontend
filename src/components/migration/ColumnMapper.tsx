'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Save, Loader2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { useMigrationApi } from '@/hooks/useMigrationApi';
import { TemplateSelector } from './TemplateSelector';
import type { FieldMapping, SourceSystem } from '@/types/migration';
import { CAMPUSLY_TARGET_FIELDS } from '@/types/migration';

interface ColumnMapperProps {
  sourceSystem: SourceSystem;
  initialMapping: Record<string, string>;
  jobId: string;
  onBack: () => void;
  onSaved: () => void;
}

const REQUIRED_FIELDS = ['firstName', 'lastName'];

export function ColumnMapper({
  sourceSystem,
  initialMapping,
  jobId,
  onBack,
  onSaved,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [templateOpen, setTemplateOpen] = useState(false);
  const { activeJobLoading } = useMigrationStore();
  const { updateMapping } = useMigrationApi();

  useEffect(() => {
    setMapping(initialMapping);
  }, [initialMapping]);

  const sourceColumns = Object.keys(mapping);
  const mappedTargets = Object.values(mapping).filter(Boolean);
  const hasRequiredFields = REQUIRED_FIELDS.every((f) => mappedTargets.includes(f));

  const handleTargetChange = (sourceCol: string, targetField: string) => {
    setMapping((prev) => ({ ...prev, [sourceCol]: targetField }));
  };

  const addSourceColumn = () => {
    const key = `Column_${sourceColumns.length + 1}`;
    setMapping((prev) => ({ ...prev, [key]: '' }));
  };

  const removeSourceColumn = (sourceCol: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      delete next[sourceCol];
      return next;
    });
  };

  const handleApplyTemplate = (fieldMappings: FieldMapping[]) => {
    const newMapping: Record<string, string> = {};
    fieldMappings.forEach((fm) => {
      newMapping[fm.sourceField] = fm.targetField;
    });
    setMapping(newMapping);
    toast.success('Template applied!');
  };

  const handleSave = async () => {
    const filteredMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([k, v]) => {
      if (v) filteredMapping[k] = v;
    });
    if (Object.keys(filteredMapping).length === 0) {
      toast.error('At least one field mapping is required');
      return;
    }
    try {
      await updateMapping(jobId, filteredMapping);
      toast.success('Mapping saved!');
      onSaved();
    } catch {
      toast.error('Failed to save mapping');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>
                Map source file columns to Campusly fields. Fields marked with * are required.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
              <FileDown className="h-4 w-4" /> Load Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Source Column</span>
              <span />
              <span>Campusly Field</span>
              <span />
            </div>
            {sourceColumns.map((sourceCol) => (
              <div
                key={sourceCol}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
              >
                <div className="rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
                  {sourceCol}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={mapping[sourceCol] || undefined}
                  onValueChange={(val: unknown) => handleTargetChange(sourceCol, val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select target field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUSLY_TARGET_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {REQUIRED_FIELDS.includes(field) ? `${field} *` : field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSourceColumn(sourceCol)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove column"
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>

          {sourceColumns.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No columns mapped. Add columns or load a template.
            </p>
          )}

          <Button variant="outline" size="sm" onClick={addSourceColumn}>
            + Add Column
          </Button>

          {!hasRequiredFields && (
            <p className="text-xs text-destructive">
              Required fields must be mapped: {REQUIRED_FIELDS.join(', ')}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              disabled={!hasRequiredFields || activeJobLoading}
              onClick={handleSave}
            >
              {activeJobLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{' '}
              Save Mapping
            </Button>
          </div>
        </CardContent>
      </Card>

      <TemplateSelector
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        sourceSystem={sourceSystem}
        onApply={handleApplyTemplate}
      />
    </>
  );
}
