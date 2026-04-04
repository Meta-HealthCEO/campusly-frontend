'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useJoinSchool } from '@/hooks/useJoinSchool';

export function JoinCodeCard() {
  const { fetchJoinCode } = useJoinSchool();
  const [joinCode, setJoinCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadCode = useCallback(async () => {
    try {
      const code = await fetchJoinCode();
      setJoinCode(code);
    } catch (err: unknown) {
      console.error('Failed to load join code', err);
      toast.error('Could not load teacher join code');
    } finally {
      setLoading(false);
    }
  }, [fetchJoinCode]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleCopy = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success('Join code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Teacher Join Code</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Share this code with independent teachers so they can link their accounts to your school.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {joinCode || '------'}
              </span>
              <Badge variant="secondary" className="ml-auto shrink-0">6 chars</Badge>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleCopy}
              disabled={!joinCode}
              className="w-full sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Teachers enter this code at{' '}
          <span className="font-medium text-foreground">Settings &rarr; Join a School</span>.
        </p>
      </CardContent>
    </Card>
  );
}
