'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type { FoundItem } from '@/types';

const categoryLabels: Record<string, string> = {
  clothing: 'Clothing', stationery: 'Stationery', lunch_box: 'Lunch Box',
  electronics: 'Electronics', sports: 'Sports', bags: 'Bags', other: 'Other',
};

const categoryStyles: Record<string, string> = {
  clothing: 'bg-blue-100 text-blue-800', stationery: 'bg-purple-100 text-purple-800',
  lunch_box: 'bg-orange-100 text-orange-800', electronics: 'bg-slate-100 text-slate-800',
  sports: 'bg-green-100 text-green-800', bags: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-800',
};

export function ClaimDialog({ item, onClaimed }: { item: FoundItem; onClaimed?: () => void }) {
  const [open, setOpen] = useState(false);

  const handleClaim = async () => {
    try {
      await apiClient.post(`/lost-found/${item.id}/claim`);
      toast.success(`Claim submitted for "${item.name}". The school will contact you.`);
      onClaimed?.();
    } catch {
      toast.error('Failed to submit claim.');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>This is mine!</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Item</DialogTitle>
          <DialogDescription>
            Are you sure &ldquo;{item.name}&rdquo; belongs to your child? The school will verify your claim.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium">{item.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Found at</span>
            <span>{item.location}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date Found</span>
            <span>{formatDate(item.dateFound)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleClaim}>Confirm Claim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FoundItemCard({ item, onClaimed }: { item: FoundItem; onClaimed?: () => void }) {
  return (
    <Card className="overflow-hidden">
      {item.photoUrl && (
        <div className="aspect-square w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-sm">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={categoryStyles[item.category] ?? ''}>
            {categoryLabels[item.category] ?? item.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{item.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatDate(item.dateFound)}</span>
          {item.status === 'unclaimed' && <ClaimDialog item={item} onClaimed={onClaimed} />}
          {item.status === 'claimed' && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Claimed</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
