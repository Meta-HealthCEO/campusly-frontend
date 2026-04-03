'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ApplicationForm } from '@/components/admissions/ApplicationForm';
import { useAdmissionsPublic } from '@/hooks/useAdmissionsPublic';
import { GraduationCap } from 'lucide-react';
import type { GradeCapacity } from '@/types/admissions';

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

export default function PublicApplyPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  const {
    capacity,
    capacityLoading,
    error,
    submitting,
    fetchCapacity,
    submitApplication,
  } = useAdmissionsPublic();

  useEffect(() => {
    if (schoolId) fetchCapacity(schoolId);
  }, [schoolId, fetchCapacity]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">School Admissions Application</h1>
          <p className="text-muted-foreground">Complete the form below to apply for admission.</p>
        </div>

        {/* Capacity info */}
        {!capacityLoading && capacity.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Available Spots</h3>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {capacity.map((cap: GradeCapacity) => (
                <div key={cap.grade} className="text-sm">
                  <span className="font-medium">{gradeLabel(cap.grade)}: </span>
                  <span className={cap.availableSpots === 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {cap.availableSpots ?? 0} spots
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <ApplicationForm
          schoolId={schoolId}
          onSubmit={submitApplication}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
