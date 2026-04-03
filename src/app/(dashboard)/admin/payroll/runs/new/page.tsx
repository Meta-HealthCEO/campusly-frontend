'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function NewPayrollRunPage() {
  const router = useRouter();
  const { createRun } = usePayrollRuns();
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!month || !year) {
      toast.error('Please select a month and year');
      return;
    }
    setSubmitting(true);
    try {
      const run = await createRun({
        month: Number(month),
        year: Number(year),
        description: description || undefined,
      });
      toast.success('Payroll run created — review the calculations');
      router.push(`/admin/payroll/runs/${run.id}`);
    } catch (err: unknown) {
      console.error('Failed to create payroll run', err);
      toast.error('Failed to create payroll run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Payroll Run" description="Calculate monthly payroll for all active staff" />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Pay Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Month <span className="text-destructive">*</span></Label>
              <Select value={month} onValueChange={(v: unknown) => setMonth(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year <span className="text-destructive">*</span></Label>
              <Select value={year} onValueChange={(v: unknown) => setYear(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. April 2026 Monthly Payroll"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={submitting || !month || !year}>
            <Calculator className="h-4 w-4 mr-1" />
            {submitting ? 'Calculating...' : 'Calculate Payroll'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
