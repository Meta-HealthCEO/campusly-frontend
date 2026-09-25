'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { codeFromSearch } from '@/lib/join-code';

interface JoinGroupCardProps {
  onJoin: (code: string) => Promise<{ message: string }>;
  submitting: boolean;
  onJoined: () => void;
}

/** Join another of your teacher's groups with its code (spec §3). */
export function JoinGroupCard({ onJoin, submitting, onJoined }: JoinGroupCardProps) {
  const [code, setCode] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code) return;
    try {
      const result = await onJoin(code);
      toast.success(result.message);
      setCode('');
      onJoined();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not join that group');
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Join another group</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="group-code">Group code</Label>
            <Input id="group-code" value={code} onChange={(e) => setCode(codeFromSearch(e.target.value))} placeholder="AB12CD"
              className="font-mono tracking-widest" autoComplete="off" disabled={submitting} />
          </div>
          <Button type="submit" disabled={submitting || code.length === 0} className="min-h-11">
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null} Join group
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Ask your teacher for the code of their other group. You stay in your current groups.</p>
      </CardContent>
    </Card>
  );
}
