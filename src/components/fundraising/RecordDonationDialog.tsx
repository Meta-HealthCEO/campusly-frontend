'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { Campaign } from '@/hooks/useFundraising';

interface RecordDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Campaign[];
  defaultCampaignId?: string;
  onSubmit: (data: {
    campaignId: string; donorName: string; donorEmail?: string;
    amount: number; message?: string; isAnonymous?: boolean;
  }) => Promise<void>;
}

export function RecordDonationDialog({
  open, onOpenChange, campaigns, defaultCampaignId, onSubmit,
}: RecordDonationDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? '');
  const [isAnonymous, setIsAnonymous] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const donorName = (fd.get('donorName') as string).trim();
    const donorEmail = (fd.get('donorEmail') as string).trim();
    const amountRands = parseFloat(fd.get('amount') as string);
    const message = (fd.get('message') as string).trim();

    if (!campaignId || !donorName || !amountRands) return;

    setSubmitting(true);
    try {
      await onSubmit({
        campaignId,
        donorName,
        donorEmail: donorEmail || undefined,
        amount: Math.round(amountRands * 100),
        message: message || undefined,
        isAnonymous,
      });
      form.reset();
      setCampaignId(defaultCampaignId ?? '');
      setIsAnonymous(false);
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
          <DialogTitle>Record Donation</DialogTitle>
          <DialogDescription>Record a new donation against a campaign.</DialogDescription>
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
              <Label htmlFor="donorName">Donor Name</Label>
              <Input id="donorName" name="donorName" placeholder="e.g. Sipho Dlamini" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="donorEmail">Email (optional)</Label>
              <Input id="donorEmail" name="donorEmail" type="email" placeholder="sipho@example.com" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Rands)</Label>
              <Input id="amount" name="amount" type="number" min="1" step="0.01" placeholder="e.g. 500" required />
            </div>
            <div className="flex items-end space-x-2 pb-0.5">
              <input
                type="checkbox" id="isAnonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isAnonymous">Anonymous donation</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" name="message" placeholder="Optional message from the donor" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Donation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
