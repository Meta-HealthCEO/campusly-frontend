'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import type { Campaign, RafflePrize } from '@/hooks/useFundraising';

interface CreateRaffleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Campaign[];
  onSubmit: (data: {
    campaignId: string; ticketPrice: number; totalTickets: number;
    drawDate: string; prizes: RafflePrize[];
  }) => Promise<void>;
}

export function CreateRaffleDialog({ open, onOpenChange, campaigns, onSubmit }: CreateRaffleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [prizes, setPrizes] = useState<RafflePrize[]>([
    { place: 1, description: '', value: 0 },
  ]);

  function addPrize() {
    setPrizes((prev) => [...prev, { place: prev.length + 1, description: '', value: 0 }]);
  }

  function removePrize(idx: number) {
    setPrizes((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, place: i + 1 })));
  }

  function updatePrize(idx: number, field: keyof RafflePrize, val: string | number) {
    setPrizes((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const ticketPriceRands = parseFloat(fd.get('ticketPrice') as string);
    const totalTickets = parseInt(fd.get('totalTickets') as string, 10);
    const drawDate = fd.get('drawDate') as string;

    if (!campaignId || !ticketPriceRands || !totalTickets || !drawDate) return;

    const validPrizes = prizes
      .filter((p) => p.description.trim())
      .map((p) => ({ ...p, value: Math.round(p.value * 100) }));

    setSubmitting(true);
    try {
      await onSubmit({
        campaignId,
        ticketPrice: Math.round(ticketPriceRands * 100),
        totalTickets,
        drawDate: new Date(drawDate).toISOString(),
        prizes: validPrizes,
      });
      form.reset();
      setCampaignId('');
      setPrizes([{ place: 1, description: '', value: 0 }]);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Raffle</DialogTitle>
          <DialogDescription>Set up a raffle linked to a campaign.</DialogDescription>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price (Rands)</Label>
              <Input id="ticketPrice" name="ticketPrice" type="number" min="1" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalTickets">Total Tickets</Label>
              <Input id="totalTickets" name="totalTickets" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawDate">Draw Date</Label>
              <Input id="drawDate" name="drawDate" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prizes</Label>
              <Button type="button" size="xs" variant="outline" onClick={addPrize}>
                <Plus className="mr-1 h-3 w-3" /> Add Prize
              </Button>
            </div>
            {prizes.map((prize, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">#{prize.place}</span>
                <Input
                  placeholder="Prize description"
                  value={prize.description}
                  onChange={(e) => updatePrize(idx, 'description', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number" placeholder="Value (R)" min="0" step="0.01"
                  value={prize.value || ''}
                  onChange={(e) => updatePrize(idx, 'value', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                {prizes.length > 1 && (
                  <Button type="button" size="xs" variant="ghost" onClick={() => removePrize(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Raffle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
