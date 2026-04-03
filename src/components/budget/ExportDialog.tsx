'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import type { Budget } from '@/types';

interface ExportDialogProps {
  budgets: Budget[];
  onExport: (budgetId: string) => Promise<void>;
}

export function ExportDialog({ budgets, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      await onExport(selectedId);
      setOpen(false);
    } catch (err: unknown) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="h-4 w-4 mr-1" /> Export to Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Budget Report</DialogTitle>
          <DialogDescription>
            Download the budget report as an Excel spreadsheet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Budget</Label>
            <Select
              value={selectedId}
              onValueChange={(v: unknown) => setSelectedId(v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a budget..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            The export includes: Budget Summary, Line Items with Actuals,
            Variance by Category, and Monthly Breakdown.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!selectedId || exporting} onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? 'Exporting...' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
