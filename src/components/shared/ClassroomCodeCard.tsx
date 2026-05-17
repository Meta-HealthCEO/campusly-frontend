'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClassroomCode } from '@/hooks/useClassroomCode';

interface ClassroomCodeCardProps {
  classId: string;
  className: string;
  initialCode?: string;
  copyMode?: 'class' | 'teachingGroup';
}

export function ClassroomCodeCard({
  classId,
  className,
  initialCode,
  copyMode = 'class',
}: ClassroomCodeCardProps) {
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const { getJoinCode, regenerateCode, loadingId } = useClassroomCode();
  const isRegenerating = loadingId === classId;
  const isTeachingGroup = copyMode === 'teachingGroup';

  const fetchCode = useCallback(async () => {
    if (code) return code;
    setLoadingFetch(true);
    try {
      const data = await getJoinCode(classId);
      setCode(data.classroomCode);
      return data.classroomCode;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error ?? 'Failed to load classroom code');
      return null;
    } finally {
      setLoadingFetch(false);
    }
  }, [classId, code, getJoinCode]);

  useEffect(() => {
    void fetchCode();
  }, [fetchCode]);

  const handleCopy = async () => {
    const joinCode = await fetchCode();
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success(`${isTeachingGroup ? 'Group' : 'Classroom'} code copied`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRegenerate = async () => {
    try {
      const data = await regenerateCode(classId);
      setCode(data.classroomCode);
      toast.success(`New ${isTeachingGroup ? 'group' : 'classroom'} code generated`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error ?? 'Failed to regenerate code');
    }
  };

  const displayCode = code ? code.split('').join(' ') : null;

  return (
    <Card size="sm" className="bg-muted/20">
      <CardContent>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-background p-2 ring-1 ring-border">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Portal access</h2>
              <p className="text-xs text-muted-foreground">
                Share this with learners who still need to join the online portal for{' '}
                <span className="font-medium text-foreground">{className}</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-32 rounded-md border bg-background px-3 py-1.5 text-center font-mono text-sm font-semibold text-primary">
              {loadingFetch ? 'Loading' : displayCode ?? 'Unavailable'}
            </div>
            {displayCode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={loadingFetch}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void fetchCode(); }}
                disabled={loadingFetch}
              >
                Retry
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Creates a new join code. Existing portal learners keep access; only the old join code stops working."
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Resetting...' : 'Reset code'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Resetting the code only affects future joins. Existing learner logins keep working.
        </p>
      </CardContent>
    </Card>
  );
}
