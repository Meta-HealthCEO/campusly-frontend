'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, CheckCircle } from 'lucide-react';
import { SurveyResponseForm } from '@/components/wellbeing/SurveyResponseForm';
import { useStudentSurvey } from '@/hooks/useStudentSurvey';
import type { SurveyAnswer } from '@/types';

export default function StudentWellbeingPage() {
  const { activeSurvey, loading, submitted, fetchActiveSurvey, submitResponse } = useStudentSurvey();

  useEffect(() => {
    fetchActiveSurvey();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (submitted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Wellbeing Check-in" description="Thank you for your response!" />
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Response Submitted</h3>
            <p className="text-sm text-muted-foreground">
              Your response has been recorded. Thank you for sharing how you feel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeSurvey) {
    return (
      <div className="space-y-6">
        <PageHeader title="Wellbeing Check-in" description="Check in on how you are feeling" />
        <EmptyState
          icon={Heart}
          title="No active survey"
          description="There are no wellbeing surveys available right now. Check back later."
        />
      </div>
    );
  }

  const handleSubmit = async (answers: SurveyAnswer[]) => {
    await submitResponse(activeSurvey.id, { answers });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Wellbeing Check-in" description="Share how you are feeling" />
      <SurveyResponseForm survey={activeSurvey} onSubmit={handleSubmit} />
    </div>
  );
}
