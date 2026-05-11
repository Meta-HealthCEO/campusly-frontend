'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { HomeworkWizardStep1 } from '@/components/homework/HomeworkWizardStep1';
import { HomeworkWizardStep2 } from '@/components/homework/HomeworkWizardStep2';
import { HomeworkWizardStep3 } from '@/components/homework/HomeworkWizardStep3';

export default function TeacherHomeworkNewPage() {
  const router = useRouter();
  const { step, reset } = useTeacherHomeworkWizardStore();

  const handleCancel = () => {
    reset();
    router.push('/teacher/homework');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Homework" description={`Step ${step} of 3`}>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />Cancel
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {step === 1 && <HomeworkWizardStep1 />}
          {step === 2 && <HomeworkWizardStep2 />}
          {step === 3 && <HomeworkWizardStep3 />}
        </CardContent>
      </Card>
    </div>
  );
}
