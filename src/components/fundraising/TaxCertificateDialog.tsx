'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { Donation } from '@/hooks/useFundraising';

interface TaxCertificateDialogProps {
  donation: Donation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    donationId: string; donorName: string; donorIdNumber?: string;
    donorAddress?: string; schoolTaxNumber: string;
  }) => Promise<void>;
}

export function TaxCertificateDialog({ donation, open, onOpenChange, onSubmit }: TaxCertificateDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!donation) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!donation) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const donorIdNumber = (fd.get('donorIdNumber') as string).trim();
    const donorAddress = (fd.get('donorAddress') as string).trim();
    const schoolTaxNumber = (fd.get('schoolTaxNumber') as string).trim();

    if (!schoolTaxNumber) return;

    setSubmitting(true);
    try {
      await onSubmit({
        donationId: donation.id,
        donorName: donation.donorName,
        donorIdNumber: donorIdNumber || undefined,
        donorAddress: donorAddress || undefined,
        schoolTaxNumber,
      });
      form.reset();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Tax Certificate</DialogTitle>
          <DialogDescription>
            Section 18A certificate for {donation.donorName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="donorIdNumber">Donor ID / Passport Number</Label>
            <Input id="donorIdNumber" name="donorIdNumber" placeholder="e.g. 8001015009087" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donorAddress">Donor Address</Label>
            <Input id="donorAddress" name="donorAddress" placeholder="e.g. 12 Oak Street, Sandton, 2196" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolTaxNumber">School Tax Number (SARS)</Label>
            <Input id="schoolTaxNumber" name="schoolTaxNumber" placeholder="e.g. 9876543210" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Certificate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
