'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, AlertCircle } from 'lucide-react';
import type { BulkImportPayload, BulkImportNodeItem } from '@/types';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BulkImportPayload) => Promise<void>;
  frameworkId: string;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSubmit,
  frameworkId,
}: BulkImportDialogProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<BulkImportNodeItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleValidate = () => {
    setError('');
    setPreview([]);
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of node objects');
        return;
      }
      const nodes = parsed as BulkImportNodeItem[];
      if (nodes.length === 0) {
        setError('Array is empty');
        return;
      }
      if (nodes.length > 500) {
        setError('Maximum 500 nodes per import');
        return;
      }
      for (const [i, node] of nodes.entries()) {
        if (!node.title || !node.code || !node.type) {
          setError(`Node at index ${i} is missing required fields (title, code, type)`);
          return;
        }
      }
      setPreview(nodes);
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleSubmit = async () => {
    if (preview.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ frameworkId, nodes: preview });
      setJsonText('');
      setPreview([]);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Nodes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label>JSON Array</Label>
            <Textarea
              rows={12}
              className="font-mono text-xs"
              placeholder={`[\n  {\n    "type": "phase",\n    "parentCode": null,\n    "title": "FET Phase",\n    "code": "CAPS-FET",\n    "order": 1\n  }\n]`}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Preview: {preview.length} nodes</p>
              <div className="max-h-40 overflow-y-auto text-xs">
                {preview.slice(0, 20).map((node, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="text-muted-foreground">{node.type}</span>
                    <span className="font-medium">{node.title}</span>
                    <span className="text-muted-foreground">({node.code})</span>
                  </div>
                ))}
                {preview.length > 20 && (
                  <p className="pt-1 text-muted-foreground">
                    ...and {preview.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview.length === 0 ? (
            <Button onClick={handleValidate} disabled={!jsonText.trim()}>
              Validate JSON
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? 'Importing...' : `Import ${preview.length} Nodes`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
