'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Ticket } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useQrTicketLookup } from '@/hooks/useEvents';
import type { QrTicketResult } from '@/hooks/useEvents';
import type { UserRef } from './types';

function getUserName(u: UserRef | string): string {
  if (typeof u === 'string') return u;
  return `${u.firstName} ${u.lastName}`;
}

export function QrLookupPanel() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState<QrTicketResult | null>(null);
  const [searching, setSearching] = useState(false);
  const { lookupQrTicket } = useQrTicketLookup();

  const handleSearch = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    setSearching(true);
    setResult(null);
    try {
      const ticket = await lookupQrTicket(qrCode);
      setResult(ticket);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Ticket not found';
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const eventTitle = result?.eventId && typeof result.eventId !== 'string' ? result.eventId.title : '-';
  const eventDate = result?.eventId && typeof result.eventId !== 'string' ? result.eventId.date : '';
  const eventVenue = result?.eventId && typeof result.eventId !== 'string' ? result.eventId.venue : '';

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    used: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4" />
          QR Code Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="Enter QR code UUID..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Look Up'}
          </Button>
        </div>

        {result && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-medium">{eventTitle}</span>
              </div>
              <Badge className={statusStyles[result.status] ?? ''}>
                {result.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Holder</p>
                <p className="font-medium">{getUserName(result.userId)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{result.ticketType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price</p>
                <p className="font-medium">{formatCurrency(result.price)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Purchased</p>
                <p className="font-medium">{result.purchasedAt ? formatDate(result.purchasedAt, 'dd MMM yyyy') : '-'}</p>
              </div>
              {eventDate && (
                <div>
                  <p className="text-muted-foreground">Event Date</p>
                  <p className="font-medium">{formatDate(eventDate, 'dd MMM yyyy')}</p>
                </div>
              )}
              {eventVenue && (
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium">{eventVenue}</p>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              QR: {result.qrCode}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
