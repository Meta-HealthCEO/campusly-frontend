'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { ExportFormat } from '@/types';

interface Props {
  onGenerate: (format: ExportFormat, dateFrom: string, dateTo: string) => Promise<unknown>;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'Standard CSV' },
  { value: 'sage_csv', label: 'Sage One CSV' },
  { value: 'xero_csv', label: 'Xero CSV' },
  { value: 'pastel_csv', label: 'Pastel CSV' },
  { value: 'quickbooks_iif', label: 'QuickBooks IIF' },
];

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ExportDialog({ onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState(toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dateTo, setDateTo] = useState(toLocalDate(new Date()));
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select a date range');
      return;
    }
    setGenerating(true);
    try {
      await onGenerate(format, dateFrom, dateTo);
      setOpen(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to generate export'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Download className="h-4 w-4 mr-2" />Export
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Generate Export</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label>Export Format <span className="text-destructive">*</span></Label>
            <Select value={format} onValueChange={(val: unknown) => setFormat(val as ExportFormat)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((f: { value: ExportFormat; label: string }) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date From <span className="text-destructive">*</span></Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date To <span className="text-destructive">*</span></Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
