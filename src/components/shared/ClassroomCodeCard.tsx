'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClassroomCode } from '@/hooks/useClassroomCode';

interface ClassroomCodeCardProps {
  classId: string;
  className: string;
  initialCode?: string;
}

export function ClassroomCodeCard({ classId, className, initialCode }: ClassroomCodeCardProps) {
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const { getJoinCode, regenerateCode, loadingId } = useClassroomCode();
  const isRegenerating = loadingId === classId;

  const handleReveal = async () => {
    if (code) return;
    setLoadingFetch(true);
    try {
      const data = await getJoinCode(classId);
      setCode(data.classroomCode);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error ?? 'Failed to load classroom code');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Classroom code copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRegenerate = async () => {
    try {
      const data = await regenerateCode(classId);
      setCode(data.classroomCode);
      toast.success('New classroom code generated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error ?? 'Failed to regenerate code');
    }
  };

  // Format code as spaced characters: ABC123 → A B C 1 2 3
  const displayCode = code ? code.split('').join(' ') : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Classroom Join Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Give this code to your students to join <span className="font-medium text-foreground">{className}</span>.
        </p>

        <div
          className="flex min-h-[64px] items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-4 cursor-pointer"
          onClick={handleReveal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReveal(); }}
        >
          {loadingFetch ? (
            <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
          ) : displayCode ? (
            <span className="font-mono text-2xl font-bold tracking-widest text-primary select-all">
              {displayCode}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Click to reveal code</span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopy}
            disabled={!code || loadingFetch}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'New Code'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Generating a new code will invalidate the old one.
        </p>
      </CardContent>
    </Card>
  );
}
