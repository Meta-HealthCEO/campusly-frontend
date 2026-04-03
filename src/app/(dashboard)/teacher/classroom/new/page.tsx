'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { SessionScheduler } from '@/components/classroom';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import type { CreateClassroomSessionPayload } from '@/types';

export default function NewClassroomSessionPage() {
  const router = useRouter();
  const { createSession } = useClassroomSessions();

  const handleSubmit = useCallback(async (data: CreateClassroomSessionPayload) => {
    try {
      await createSession(data);
      toast.success('Session scheduled successfully');
      router.push('/teacher/classroom');
    } catch (err: unknown) {
      console.error('Failed to schedule session', err);
      toast.error('Failed to schedule session');
    }
  }, [createSession, router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Schedule Session" description="Set up a new virtual classroom session">
        <Button variant="outline" onClick={() => router.push('/teacher/classroom')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <SessionScheduler onSubmit={handleSubmit} />
    </div>
  );
}
