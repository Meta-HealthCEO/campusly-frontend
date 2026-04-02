'use client';

import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WaitlistButtonProps {
  onJoin: (studentId?: string) => Promise<void>;
}

export function WaitlistButton({ onJoin }: WaitlistButtonProps) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoin();
      setJoined(true);
      toast.success('You have been added to the waitlist');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to join waitlist',
      );
    } finally {
      setJoining(false);
    }
  };

  if (joined) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1">
        <Users className="h-3.5 w-3.5" />
        On Waitlist
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className="gap-1"
      onClick={handleJoin}
      disabled={joining}
    >
      {joining ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Users className="h-3.5 w-3.5" />
      )}
      Join Waitlist
    </Button>
  );
}
