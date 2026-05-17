'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJoinClass } from '@/hooks/useJoinClass';

interface JoinClassCardProps {
  /** Called after a successful join so the dashboard can refresh student data. */
  onJoined?: () => void;
}

export function JoinClassCard({ onJoined }: JoinClassCardProps) {
  const [code, setCode] = useState('');
  const { join, submitting } = useJoinClass();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const result = await join(trimmed);
      const movedFrom = result.previousClassId ? ' (you have been moved out of your previous class)' : '';
      toast.success(`Joined ${result.class.name}${movedFrom}`);
      setCode('');
      onJoined?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not join class';
      toast.error(msg);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4" /> Join a class with a code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            maxLength={20}
            className="flex-1 font-mono tracking-widest"
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !code.trim()} className="gap-1">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Join class
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Ask your teacher for the class code. Joining a new class will replace your current homeroom.
        </p>
      </CardContent>
    </Card>
  );
}
