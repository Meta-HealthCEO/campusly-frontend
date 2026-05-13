'use client';

import { useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useAuthStore } from '@/stores/useAuthStore';
import { ProGate } from '@/components/subscription/ProGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { PapersNewWizard } from './_PapersNewWizard';

export default function NewPaperPage() {
  const { user } = useAuthStore();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Test Paper"
        description="Pick curriculum topics, set paper details, then generate a CAPS-aligned paper and memo with AI."
      />
      <ProGate
        feature="paperGeneration"
        fallback={
          <>
            <EmptyState
              icon={Sparkles}
              title="Paper generation is a Pro feature"
              description="Generate full CAPS-aligned papers and memos with AI. Start a 14-day free trial."
              action={
                <Button size="lg" onClick={() => setUpgradeOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" /> See plans
                </Button>
              }
            />
            <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="paperGeneration" />
          </>
        }
      >
        <PapersNewWizard />
      </ProGate>
    </div>
  );
}
