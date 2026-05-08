'use client';

import { useRouter } from 'next/navigation';
import { PaperWizard } from '@/components/papers/PaperWizard';
import { PageHeader } from '@/components/shared/PageHeader';

export default function NewPaperPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="New Paper"
        description="Configure paper metadata, then generate or build manually."
      />
      <PaperWizard
        onComplete={(paperId: string) => router.push(`/teacher/papers/${paperId}`)}
        onCancel={() => router.push('/teacher/papers')}
      />
    </div>
  );
}
