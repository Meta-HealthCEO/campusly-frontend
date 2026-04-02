'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PortfolioTimeline from '@/components/careers/PortfolioTimeline';
import PortfolioExtracurriculars from '@/components/careers/PortfolioExtracurriculars';
import PortfolioCommunityService from '@/components/careers/PortfolioCommunityService';
import TranscriptDownload from '@/components/careers/TranscriptDownload';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { usePortfolio } from '@/hooks/usePortfolio';

const noop = async () => {};

export default function ParentPortfolioPage() {
  const { parent, children, loading: parentLoading } = useCurrentParent();
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const activeChildId = selectedChildId || children[0]?.id || '';
  const { portfolio, loading: portfolioLoading, downloadTranscript } =
    usePortfolio(activeChildId);

  if (parentLoading) {
    return <LoadingSpinner />;
  }

  if (!parent || children.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No Children Found"
        description="No children are linked to your account. Please contact your school administrator."
      />
    );
  }

  const selectedChild = children.find((c) => c.id === activeChildId);
  const childLabel = selectedChild
    ? `${selectedChild.firstName} ${selectedChild.lastName}`
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Portfolio"
        description={`Viewing portfolio for ${childLabel}`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {children.length > 1 && (
            <Select
              value={activeChildId}
              onValueChange={(val: string) => setSelectedChildId(val)}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <TranscriptDownload onDownload={downloadTranscript} />
        </div>
      </PageHeader>

      {portfolioLoading ? (
        <LoadingSpinner />
      ) : !portfolio ? (
        <EmptyState
          icon={BookOpen}
          title="No Portfolio Found"
          description={`${childLabel}'s academic portfolio has not been created yet. Please contact the school administrator.`}
        />
      ) : (
        <Tabs defaultValue="academic-history">
          <TabsList className="flex-wrap">
            <TabsTrigger value="academic-history">Academic History</TabsTrigger>
            <TabsTrigger value="extracurriculars">Extracurriculars</TabsTrigger>
            <TabsTrigger value="community-service">Community Service</TabsTrigger>
          </TabsList>

          <TabsContent value="academic-history">
            {portfolio.academicHistory.length > 0 ? (
              <PortfolioTimeline academicHistory={portfolio.academicHistory} />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No Academic Records"
                description="Academic history will appear here once grades are recorded."
              />
            )}
          </TabsContent>

          <TabsContent value="extracurriculars">
            <PortfolioExtracurriculars
              extracurriculars={portfolio.extracurriculars}
              onAdd={noop}
              readOnly
            />
          </TabsContent>

          <TabsContent value="community-service">
            <PortfolioCommunityService
              communityService={portfolio.communityService}
              onAdd={noop}
              readOnly
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
