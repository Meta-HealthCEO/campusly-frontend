'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileWarning, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CertificateDownloadCard } from '@/components/courses/CertificateDownloadCard';
import { useCertificate } from '@/hooks/useCertificate';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { ROUTES } from '@/lib/constants';
import type { Certificate, Enrolment } from '@/types';

function getCourseIdFromEnrolment(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

export default function StudentCourseCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { myEnrolments, loading: enrolmentsLoading } = useStudentCourses();
  const { downloadCertificate, fetchCertificateMeta } = useCertificate();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [fetching, setFetching] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const enrolment = myEnrolments.find((e) => getCourseIdFromEnrolment(e) === courseId) ?? null;

  // Fetch certificate metadata once we know the enrolment id.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enrolment?.id) return;
      setFetching(true);
      const meta = await fetchCertificateMeta(enrolment.id);
      if (!cancelled) {
        setCertificate(meta);
        setFetching(false);
      }
    }
    if (enrolment) {
      void load();
    } else if (!enrolmentsLoading) {
      setFetching(false);
    }
    return () => {
      cancelled = true;
    };
  }, [enrolment, enrolmentsLoading, fetchCertificateMeta]);

  const handleDownload = async () => {
    if (!enrolment?.id) return;
    setDownloading(true);
    try {
      await downloadCertificate(enrolment.id);
    } finally {
      setDownloading(false);
    }
  };

  const loading = enrolmentsLoading || fetching;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate" description="Your course completion certificate" />
        <LoadingSpinner />
      </div>
    );
  }

  if (!enrolment || !certificate) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate" description="Your course completion certificate" />
        <EmptyState
          icon={FileWarning}
          title="No Certificate Available"
          description="This certificate is not available yet. You may not have completed the course, not met the pass mark, or certificates may be disabled for this course."
          action={
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.STUDENT_COURSE_HOME(courseId))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Certificate" description="Your course completion certificate">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(ROUTES.STUDENT_COURSE_HOME(courseId))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>
      <CertificateDownloadCard
        certificate={certificate}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </div>
  );
}
