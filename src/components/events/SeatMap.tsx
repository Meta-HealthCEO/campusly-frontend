'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Armchair, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EventSeat } from './types';

interface SeatMapProps {
  seats: EventSeat[];
  loading: boolean;
  onCreateSeats: (seats: { row: string; seatNumber: number; label?: string }[]) => Promise<void>;
  onReleaseSeat: (seatId: string) => Promise<void>;
}

const seatStatusStyles: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
  reserved: 'bg-amber-100 text-amber-700 border-amber-300',
  sold: 'bg-destructive/10 text-destructive border-red-300',
};

export function SeatMap({ seats, loading, onCreateSeats, onReleaseSeat }: SeatMapProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [rowLetter, setRowLetter] = useState('A');
  const [seatCount, setSeatCount] = useState('10');
  const [creating, setCreating] = useState(false);

  if (loading) return <LoadingSpinner />;

  // Group seats by row
  const rows = seats.reduce<Record<string, EventSeat[]>>((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const sortedRowKeys = Object.keys(rows).sort();

  const handleCreate = async () => {
    if (!rowLetter.trim() || !seatCount) {
      toast.error('Please fill in row and seat count');
      return;
    }
    setCreating(true);
    try {
      const count = parseInt(seatCount, 10);
      const newSeats = Array.from({ length: count }, (_, i) => ({
        row: rowLetter.toUpperCase(),
        seatNumber: i + 1,
        label: `${rowLetter.toUpperCase()}${i + 1}`,
      }));
      await onCreateSeats(newSeats);
      toast.success(`Created ${count} seats in row ${rowLetter.toUpperCase()}`);
      setCreateOpen(false);
      setRowLetter(String.fromCharCode(rowLetter.toUpperCase().charCodeAt(0) + 1));
      setSeatCount('10');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create seats';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRelease = async (seatId: string) => {
    try {
      await onReleaseSeat(seatId);
      toast.success('Seat released');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to release seat';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-emerald-200 border border-emerald-300" />
            Available
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-amber-200 border border-amber-300" />
            Reserved
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-200 border border-red-300" />
            Sold
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add Row
        </Button>
      </div>

      {seats.length === 0 ? (
        <EmptyState icon={Armchair} title="No Seats" description="No seating plan has been created for this event." />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Seating Plan ({seats.length} seats)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedRowKeys.map((rowKey) => {
              const rowSeats = rows[rowKey].sort((a, b) => a.seatNumber - b.seatNumber);
              return (
                <div key={rowKey} className="flex items-center gap-2">
                  <Badge variant="outline" className="w-8 justify-center font-mono">{rowKey}</Badge>
                  <div className="flex flex-wrap gap-1">
                    {rowSeats.map((seat) => (
                      <button
                        key={seat.id}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-mono transition-colors',
                          seatStatusStyles[seat.status]
                        )}
                        title={`${seat.label ?? `${seat.row}${seat.seatNumber}`} - ${seat.status}`}
                        onClick={() => seat.status !== 'available' && handleRelease(seat.id)}
                        disabled={seat.status === 'available'}
                      >
                        {seat.seatNumber}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Add Seat Row</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Row Letter</Label>
              <Input value={rowLetter} onChange={(e) => setRowLetter(e.target.value)} maxLength={2} placeholder="A" />
            </div>
            <div className="space-y-2">
              <Label>Number of Seats</Label>
              <Input type="number" min="1" max="50" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Seats'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
