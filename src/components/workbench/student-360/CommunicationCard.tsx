'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student360Communication } from '@/types';

interface CommunicationCardProps {
  data: Student360Communication;
}

export function CommunicationCard({ data }: CommunicationCardProps) {
  const lastContact = data.lastContactDate
    ? new Date(data.lastContactDate).toLocaleDateString()
    : 'No contact yet';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Communication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Last Contact</p>
            <p className="font-medium">{lastContact}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Messages This Term</p>
            <p className="text-2xl font-bold">{data.messageCountThisTerm}</p>
          </div>
        </div>
        <Link href="/teacher/communication" className="w-full">
          <Button className="w-full" size="default">
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
