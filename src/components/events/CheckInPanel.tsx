'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, CheckCircle, XCircle, AlertTriangle, Ticket, Users, Ban } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { EventCheckIn, CheckInStats, UserRef, EventTicket } from './types';

interface CheckInPanelProps {
  checkIns: EventCheckIn[];
  stats: CheckInStats | null;
  loading: boolean;
  onCheckIn: (qrCode: string) => Promise<EventCheckIn>;
}

function getTicketInfo(ticketId: EventTicket | string): string {
  if (typeof ticketId === 'string') return ticketId.slice(0, 8);
  return ticketId.qrCode?.slice(0, 8) ?? ticketId.id?.slice(0, 8) ?? '-';
}

function getCheckedInByName(by: UserRef | string): string {
  if (typeof by === 'string') return by;
  return `${by.firstName} ${by.lastName}`;
}

export function CheckInPanel({ checkIns, stats, loading, onCheckIn }: CheckInPanelProps) {
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCheckIn = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    setScanning(true);
    setLastResult(null);
    try {
      await onCheckIn(qrCode.trim());
      setLastResult({ success: true, message: 'Check-in successful!' });
      toast.success('Check-in successful!');
      setQrCode('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error?.response?.data?.message ?? 'Check-in failed';
      setLastResult({ success: false, message });
      toast.error(message);
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Tickets" value={String(stats.totalTickets)} icon={Ticket} />
          <StatCard title="Checked In" value={String(stats.checkedIn)} icon={CheckCircle} />
          <StatCard title="Active Tickets" value={String(stats.activeTickets)} icon={Users} />
          <StatCard title="Cancelled" value={String(stats.cancelledTickets)} icon={Ban} />
        </div>
      )}

      {/* Scanner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Manual QR Code Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Enter or scan QR code..."
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              className="flex-1"
            />
            <Button onClick={handleCheckIn} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Check In'}
            </Button>
          </div>
          {lastResult && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-sm ${lastResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {lastResult.success ? <CheckCircle className="h-4 w-4" /> : lastResult.message.includes('already') ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {lastResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      {checkIns.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No Check-Ins" description="No one has been checked in yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Checked In At</TableHead>
                <TableHead>Scanned By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkIns.map((ci) => (
                <TableRow key={ci.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {getTicketInfo(ci.ticketId)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(ci.checkedInAt, 'dd MMM yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>{getCheckedInByName(ci.checkedInBy)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
