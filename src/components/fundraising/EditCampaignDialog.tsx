'use client';

import { useState, useEffect } from 'react';
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

interface EditCampaignDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: Record<string, unknown>) => Promise<void>;
}

function toDateInput(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function EditCampaignDialog({ campaign, open, onOpenChange, onSubmit }: EditCampaignDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (campaign) setIsActive(campaign.isActive);
  }, [campaign]);

  if (!campaign) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campaign) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get('title') as string).trim();
    const description = (fd.get('description') as string).trim();
    const targetRands = parseFloat(fd.get('targetAmount') as string);
    const startDate = fd.get('startDate') as string;
    const endDate = fd.get('endDate') as string;

    if (!title || !targetRands || !startDate || !endDate) return;

    setSubmitting(true);
    try {
      await onSubmit(campaign.id, {
        title,
        description,
        targetAmount: Math.round(targetRands * 100),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isActive,
      });
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
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>Update campaign details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editTitle">Campaign Name</Label>
            <Input id="editTitle" name="title" defaultValue={campaign.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editDesc">Description</Label>
            <Textarea id="editDesc" name="description" defaultValue={campaign.description} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editTarget">Target Amount (Rands)</Label>
              <Input
                id="editTarget" name="targetAmount" type="number" min="1" step="0.01"
                defaultValue={campaign.targetAmount / 100} required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v: unknown) => setIsActive((v as string) === 'active')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editStart">Start Date</Label>
              <Input id="editStart" name="startDate" type="date" defaultValue={toDateInput(campaign.startDate)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEnd">End Date</Label>
              <Input id="editEnd" name="endDate" type="date" defaultValue={toDateInput(campaign.endDate)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
