'use client';

import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useAuthStore } from '@/stores/useAuthStore';
import { aiActionsLeft } from '@/lib/ai-allowance';
import { AIUsageNotice, AIUsedUpState } from '@/components/billing/AIUsageNotice';
import { PapersNewWizard } from './_PapersNewWizard';

export default function NewPaperPage() {
  const { user } = useAuthStore();
  const { usage, loading: usageLoading } = useAIUsage();
  const { loading: frameworksLoading } = useCurriculumStructure();

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="Complete setup before creating a paper."
      />
    );
  }

  if (frameworksLoading || usageLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Test Paper"
        description="Pick curriculum topics, set paper details, then generate a CAPS-aligned paper and memo with AI."
      />
      {aiActionsLeft(usage) === 0 ? (
        <AIUsedUpState usage={usage} />
      ) : (
        <>
          <AIUsageNotice usage={usage} />
          <PapersNewWizard />
        </>
      )}
    </div>
  );
}
