'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TranscriptView } from '@/components/students/TranscriptView';
import { useTranscript } from '@/hooks/useTranscript';

export default function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { transcript, loading, error } = useTranscript(id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/students/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </Link>
        <PageHeader title="Academic Transcript" description="Cumulative marks across all terms and years" />
      </div>

      {error && <EmptyState title="Error" description={error} />}
      {transcript && <TranscriptView transcript={transcript} />}
      {!error && !transcript && !loading && (
        <EmptyState title="No Transcript" description="No academic records found for this student." />
      )}
    </div>
  );
}
