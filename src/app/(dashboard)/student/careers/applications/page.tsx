'use client';

import { useState, useCallback } from 'react';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

import type { CareerApplication } from '@/types';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useApplications } from '@/hooks/useApplications';
import { useProgrammeMatcher } from '@/hooks/useProgrammeMatcher';

import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ApplicationTracker } from '@/components/careers/ApplicationTracker';
import { ApplicationForm } from '@/components/careers/ApplicationForm';
import DeadlineTimeline from '@/components/careers/DeadlineTimeline';
import { Button } from '@/components/ui/button';

export default function ApplicationsPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const studentId = student?.id ?? '';

  const {
    applications,
    deadlines,
    loading: appsLoading,
    createApplication,
    updateApplication,
    uploadDocument,
    getPrefill,
  } = useApplications(studentId);

  const { matchResult, loading: matchLoading } = useProgrammeMatcher(studentId);

  const [formOpen, setFormOpen] = useState(false);
  const [uploadingAppId, setUploadingAppId] = useState<string | undefined>(undefined);

  const isLoading = studentLoading || (!!studentId && appsLoading);

  const programmes = (matchResult?.matches ?? []).map((m) => ({
    id: m.programmeId,
    name: m.programmeName,
    universityName: m.universityName,
  }));

  const handleUpdateStatus = useCallback(
    (id: string, status: string) => {
      updateApplication(id, { status } as Partial<CareerApplication>)
        .then(() => toast.success('Application status updated'))
        .catch(() => toast.error('Failed to update status'));
    },
    [updateApplication],
  );

  const handleUploadDocument = useCallback((id: string) => {
    setUploadingAppId(id);
    setFormOpen(true);
  }, []);

  const handleSubmitApplication = useCallback(
    async (programmeId: string, notes?: string) => {
      await createApplication(programmeId, notes);
      setFormOpen(false);
      setUploadingAppId(undefined);
      toast.success('Application created');
    },
    [createApplication],
  );

  const handleUploadFile = useCallback(
    async (applicationId: string, file: File, name: string, type: string) => {
      await uploadDocument(applicationId, file, name, type);
      setFormOpen(false);
      setUploadingAppId(undefined);
      toast.success('Document uploaded');
    },
    [uploadDocument],
  );

  const handlePrefill = useCallback(
    async (applicationId: string) => {
      try {
        const data = await getPrefill(applicationId);
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        toast.success('Application data copied to clipboard');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate pre-fill data');
      }
    },
    [getPrefill],
  );

  const handleFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) setUploadingAppId(undefined);
  }, []);

  if (isLoading) return <LoadingSpinner />;

  if (!student) {
    return (
      <EmptyState
        icon={FileText}
        title="Student profile not found"
        description="We could not find a student profile linked to your account."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Applications" description="Track your university applications">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </PageHeader>

      {deadlines.length > 0 && <DeadlineTimeline deadlines={deadlines} />}

      {applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Start tracking your university applications by creating your first one."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Application
            </Button>
          }
        />
      ) : (
        <ApplicationTracker
          applications={applications}
          onUpdateStatus={handleUpdateStatus}
          onUploadDocument={handleUploadDocument}
          onPrefill={handlePrefill}
        />
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleSubmitApplication}
        onUploadDocument={handleUploadFile}
        applicationId={uploadingAppId}
        programmes={programmes}
      />
    </div>
  );
}
