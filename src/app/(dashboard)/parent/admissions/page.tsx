'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/admissions/ApplicationStatusBadge';
import { StatusTimeline } from '@/components/admissions/StatusTimeline';
import { useParentAdmissions } from '@/hooks/useParentAdmissions';
import { FileText } from 'lucide-react';
import type { AdmissionApplication } from '@/types/admissions';

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

export default function ParentAdmissionsPage() {
  const { applications, loading, fetchMyApplications } = useParentAdmissions();

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Applications"
        description="Track the status of your admissions applications."
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications"
          description="You have not submitted any admissions applications yet."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1">
          {applications.map((app: AdmissionApplication) => (
            <Card key={app.id || app._id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">
                    {app.applicantFirstName} {app.applicantLastName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {app.applicationNumber} - {gradeLabel(app.gradeApplyingFor)} ({app.yearApplyingFor})
                  </p>
                </div>
                <ApplicationStatusBadge status={app.status} />
              </CardHeader>
              <CardContent>
                {app.interviewDate && (
                  <p className="text-sm mb-3">
                    <span className="text-muted-foreground">Interview: </span>
                    {new Date(app.interviewDate).toLocaleString('en-ZA')}
                    {app.interviewVenue && <> at {app.interviewVenue}</>}
                  </p>
                )}
                <StatusTimeline history={app.statusHistory ?? []} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
