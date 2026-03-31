'use client';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { EventRsvp, UserRef } from './types';

interface RsvpTableProps {
  rsvps: EventRsvp[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  attending: 'bg-emerald-100 text-emerald-700',
  not_attending: 'bg-red-100 text-red-700',
  maybe: 'bg-yellow-100 text-yellow-700',
};

const statusLabels: Record<string, string> = {
  attending: 'Attending',
  not_attending: 'Not Attending',
  maybe: 'Maybe',
};

function getUserName(user: UserRef | string): string {
  if (typeof user === 'string') return user;
  return `${user.firstName} ${user.lastName}`;
}

function getUserEmail(user: UserRef | string): string {
  if (typeof user === 'string') return '';
  return user.email;
}

export function RsvpTable({ rsvps, loading }: RsvpTableProps) {
  if (loading) return <LoadingSpinner />;

  if (rsvps.length === 0) {
    return <EmptyState icon={Users} title="No RSVPs" description="No one has RSVPed to this event yet." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Headcount</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rsvps.map((rsvp) => (
            <TableRow key={rsvp.id}>
              <TableCell className="font-medium">{getUserName(rsvp.userId)}</TableCell>
              <TableCell className="text-muted-foreground">{getUserEmail(rsvp.userId)}</TableCell>
              <TableCell>
                <Badge className={statusStyles[rsvp.status] ?? ''}>
                  {statusLabels[rsvp.status] ?? rsvp.status}
                </Badge>
              </TableCell>
              <TableCell>{rsvp.headcount}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {rsvp.notes || '-'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(rsvp.createdAt, 'dd MMM yyyy HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
