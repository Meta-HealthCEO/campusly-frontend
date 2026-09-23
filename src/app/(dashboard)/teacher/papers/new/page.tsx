'use client';

import { useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useAuthStore } from '@/stores/useAuthStore';
import { paperGenerationAccess } from '@/lib/paper-access';
import { FreeAllowanceBanner } from '@/components/subscription/FreeAllowanceBanner';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { PapersNewWizard } from './_PapersNewWizard';

export default function NewPaperPage() {
  const { user } = useAuthStore();
  const freeAllowance = useAuthStore((s) => s.freeAllowance);
  const entitled = useEntitlement('paperGeneration');
  const { loading: frameworksLoading } = useCurriculumStructure();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="Complete setup before creating a paper."
      />
    );
  }

  if (frameworksLoading) return <LoadingSpinner />;

  const access = paperGenerationAccess(entitled, freeAllowance);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Test Paper"
        description="Pick curriculum topics, set paper details, then generate a CAPS-aligned paper and memo with AI."
      />
      {access.allowed ? (
        <>
          {access.freeRemaining !== null && access.freeLimit !== null ? (
            <FreeAllowanceBanner
              remaining={access.freeRemaining}
              limit={access.freeLimit}
              onSeePlans={() => setUpgradeOpen(true)}
            />
          ) : null}
          <PapersNewWizard />
        </>
      ) : (
        <EmptyState
          icon={Sparkles}
          title={
            access.freeLimit !== null
              ? `You've used your ${access.freeLimit} free AI papers`
              : 'Paper generation is a Pro feature'
          }
          description="Keep generating full CAPS-aligned papers and memos with Pro. Start with a 14-day free trial."
          action={
            <Button size="lg" onClick={() => setUpgradeOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" /> See plans
            </Button>
          }
        />
      )}
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="paperGeneration" />
    </div>
  );
}
