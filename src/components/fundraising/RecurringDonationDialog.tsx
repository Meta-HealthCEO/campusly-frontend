'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { Campaign } from '@/hooks/useFundraising';

interface RecurringDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Campaign[];
  onSubmit: (data: {
    campaignId: string; donorName: string; donorEmail: string;
    amount: number; frequency: 'monthly' | 'weekly'; nextChargeDate: string;
  }) => Promise<void>;
}

export function RecurringDonationDialog({
  open, onOpenChange, campaigns, onSubmit,
}: RecurringDonationDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const donorName = (fd.get('donorName') as string).trim();
    const donorEmail = (fd.get('donorEmail') as string).trim();
    const amountRands = parseFloat(fd.get('amount') as string);
    const nextChargeDate = fd.get('nextChargeDate') as string;

    if (!campaignId || !donorName || !donorEmail || !amountRands || !nextChargeDate) return;

    setSubmitting(true);
    try {
      await onSubmit({
        campaignId,
        donorName,
        donorEmail,
        amount: Math.round(amountRands * 100),
        frequency,
        nextChargeDate: new Date(nextChargeDate).toISOString(),
      });
      form.reset();
      setCampaignId('');
      setFrequency('monthly');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Recurring Donation</DialogTitle>
          <DialogDescription>Set up a scheduled recurring donation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign</Label>
            <Select value={campaignId} onValueChange={(v: unknown) => setCampaignId(v as string)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select campaign" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recDonorName">Donor Name</Label>
              <Input id="recDonorName" name="donorName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recDonorEmail">Donor Email</Label>
              <Input id="recDonorEmail" name="donorEmail" type="email" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="recAmount">Amount (Rands)</Label>
              <Input id="recAmount" name="amount" type="number" min="1" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v: unknown) => setFrequency(v as 'monthly' | 'weekly')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextCharge">Next Charge Date</Label>
              <Input id="nextCharge" name="nextChargeDate" type="date" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Recurring
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
