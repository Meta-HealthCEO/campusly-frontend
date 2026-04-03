'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGovernancePolicies } from '@/hooks/useGovernancePolicies';
import {
  PolicyDetailView, AcknowledgementTracker, PolicyVersionHistory,
} from '@/components/governance';

export default function PolicyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const {
    activePolicy, fetchPolicy, acknowledgePolicy, acknowledgements, fetchAcknowledgements,
    loading,
  } = useGovernancePolicies();
  const [activeTab, setActiveTab] = useState('detail');

  useEffect(() => {
    fetchPolicy(id);
    fetchAcknowledgements(id);
  }, [id, fetchPolicy, fetchAcknowledgements]);

  if (loading || !activePolicy) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title={activePolicy.title} description={`Policy — Version ${activePolicy.version}`} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="acknowledgements">Acknowledgements</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-4">
          <PolicyDetailView policy={activePolicy} />
        </TabsContent>

        <TabsContent value="acknowledgements" className="mt-4">
          <AcknowledgementTracker acknowledgements={acknowledgements} totalStaff={0} />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <PolicyVersionHistory
            versions={activePolicy.previousVersions ?? []}
            currentVersion={activePolicy.version}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
