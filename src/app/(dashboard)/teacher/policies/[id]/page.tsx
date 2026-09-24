'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { PolicyDetailView, PolicyAcknowledgeButton } from '@/components/governance';
import { useGovernancePolicies } from '@/hooks/useGovernancePolicies';
import { isPolicyAcknowledged } from '@/lib/policy-acknowledgement';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function TeacherPolicyPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const {
    activePolicy, fetchPolicy, acknowledgePolicy, pendingAcknowledgements, fetchPendingAcknowledgements, loading,
  } = useGovernancePolicies();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchPolicy(id), fetchPendingAcknowledgements()]).finally(() => setRequested(true));
  }, [id, fetchPolicy, fetchPendingAcknowledgements]);

  const back = (
    <Link href={ROUTES.TEACHER_POLICIES} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      All policies
    </Link>
  );

  if (!requested || loading) return <LoadingSpinner />;
  if (!activePolicy) {
    return <EmptyState icon={BookOpen} title="This policy isn't available" description="It may have been withdrawn or replaced." action={back} />;
  }

  const acknowledged = isPolicyAcknowledged(id, pendingAcknowledgements, activePolicy.status);
  return (
    <div className="space-y-6">
      <PageHeader title={activePolicy.title} description={`Version ${activePolicy.version}`}>
        {back}
        {acknowledged !== null && (
          <PolicyAcknowledgeButton
            acknowledged={acknowledged}
            onAcknowledge={async () => {
              await acknowledgePolicy(id);
              await fetchPendingAcknowledgements();
            }}
          />
        )}
      </PageHeader>
      <PolicyDetailView policy={activePolicy} />
    </div>
  );
}
