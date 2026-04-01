'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Heart, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CommunityServiceEntry } from '@/types';

interface PortfolioCommunityServiceProps {
  communityService: CommunityServiceEntry[];
  onAdd: (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => Promise<void>;
  readOnly?: boolean;
}

export default function PortfolioCommunityService({
  communityService,
  onAdd,
  readOnly,
}: PortfolioCommunityServiceProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [organization, setOrganization] = useState('');
  const [hours, setHours] = useState(1);
  const [description, setDescription] = useState('');

  const totalHours = communityService.reduce((sum, entry) => sum + entry.hours, 0);

  const resetForm = () => {
    setYear(new Date().getFullYear());
    setOrganization('');
    setHours(1);
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || hours < 1) return;
    setSubmitting(true);
    try {
      await onAdd({
        year,
        organization: organization.trim(),
        hours,
        description: description.trim(),
      });
      toast.success('Community service entry added');
      resetForm();
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add entry';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Group by year descending
  const grouped = [...communityService]
    .sort((a, b) => b.year - a.year)
    .reduce<Record<number, CommunityServiceEntry[]>>((acc, item) => {
      (acc[item.year] ??= []).push(item);
      return acc;
    }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 shrink-0" />
          Community Service
          <Badge variant="secondary" className="ml-1">{totalHours} hrs</Badge>
        </CardTitle>
        {!readOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </DialogTrigger>
            <DialogContent className="flex flex-col max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Add Community Service</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                  <div>
                    <Label htmlFor="cs-year">Year <span className="text-destructive">*</span></Label>
                    <Input
                      id="cs-year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cs-org">
                      Organization <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cs-org"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cs-hours">Hours <span className="text-destructive">*</span></Label>
                    <Input
                      id="cs-hours"
                      type="number"
                      min={1}
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cs-desc">Description</Label>
                    <Input
                      id="cs-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting || !organization.trim() || hours < 1}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {communityService.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No community service entries recorded.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([yr, items]) => (
                <div key={yr}>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{yr}</h4>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={`${item.organization}-${idx}`}
                        className="flex items-start justify-between gap-2 rounded-md border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.organization}</p>
                          <p className="text-xs text-muted-foreground">{item.hours} hours</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={item.verifiedBy ? 'default' : 'outline'} className="shrink-0">
                          {item.verifiedBy ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
