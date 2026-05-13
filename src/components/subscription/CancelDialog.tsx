'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelDialog({ open, onOpenChange }: Props) {
  const { subscription, refetch } = useSubscription();
  const [loading, setLoading] = useState(false);

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : 'the end of your current period';

  const cancel = async () => {
    setLoading(true);
    try {
      await apiClient.post('/subscriptions/cancel', {});
      toast.success(`Cancelled. Pro stays active until ${periodEnd}.`);
      await refetch();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Cancel Pro subscription?</DialogTitle>
          <DialogDescription>
            You&apos;ll keep Pro features until {periodEnd}, then move to the Free tier.
            You can resume anytime before that date.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep subscription
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={loading}>
            {loading ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
