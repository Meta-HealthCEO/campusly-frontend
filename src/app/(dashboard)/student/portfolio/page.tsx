'use client';

import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PortfolioTimeline from '@/components/careers/PortfolioTimeline';
import PortfolioExtracurriculars from '@/components/careers/PortfolioExtracurriculars';
import PortfolioCommunityService from '@/components/careers/PortfolioCommunityService';
import TranscriptDownload from '@/components/careers/TranscriptDownload';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function StudentPortfolioPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { portfolio, loading: portfolioLoading, addExtracurricular, addCommunityService, downloadTranscript } =
    usePortfolio(student?.id ?? '');

  if (studentLoading || portfolioLoading) {
    return <LoadingSpinner />;
  }

  if (!portfolio) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No Portfolio Found"
        description="Your academic portfolio has not been created yet. Please contact your school administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Portfolio" description="View your academic history, activities, and achievements">
        <TranscriptDownload onDownload={downloadTranscript} />
      </PageHeader>

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
              description="Your academic history will appear here once grades are recorded."
            />
          )}
        </TabsContent>

        <TabsContent value="extracurriculars">
          <PortfolioExtracurriculars
            extracurriculars={portfolio.extracurriculars}
            onAdd={addExtracurricular}
          />
        </TabsContent>

        <TabsContent value="community-service">
          <PortfolioCommunityService
            communityService={portfolio.communityService}
            onAdd={addCommunityService}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
