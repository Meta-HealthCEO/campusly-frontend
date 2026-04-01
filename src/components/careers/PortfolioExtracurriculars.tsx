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
import { Award, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Extracurricular } from '@/types';

interface PortfolioExtracurricularsProps {
  extracurriculars: Extracurricular[];
  onAdd: (data: Omit<Extracurricular, 'verifiedBy'>) => Promise<void>;
  readOnly?: boolean;
}

export default function PortfolioExtracurriculars({
  extracurriculars,
  onAdd,
  readOnly,
}: PortfolioExtracurricularsProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activity, setActivity] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setYear(new Date().getFullYear());
    setActivity('');
    setRole('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim() || !role.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ year, activity: activity.trim(), role: role.trim(), description: description.trim() });
      toast.success('Extracurricular added');
      resetForm();
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add extracurricular';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Group by year descending
  const grouped = [...extracurriculars]
    .sort((a, b) => b.year - a.year)
    .reduce<Record<number, Extracurricular[]>>((acc, item) => {
      (acc[item.year] ??= []).push(item);
      return acc;
    }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 shrink-0" />
          Extracurriculars
        </CardTitle>
        {!readOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </DialogTrigger>
            <DialogContent className="flex flex-col max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Add Extracurricular</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                  <div>
                    <Label htmlFor="ec-year">Year <span className="text-destructive">*</span></Label>
                    <Input
                      id="ec-year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ec-activity">Activity <span className="text-destructive">*</span></Label>
                    <Input
                      id="ec-activity"
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ec-role">Role <span className="text-destructive">*</span></Label>
                    <Input
                      id="ec-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ec-desc">Description</Label>
                    <Input
                      id="ec-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting || !activity.trim() || !role.trim()}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {extracurriculars.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No extracurricular activities recorded.
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
                        key={`${item.activity}-${idx}`}
                        className="flex items-start justify-between gap-2 rounded-md border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.activity}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.role}</p>
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
