'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';

export default function StudentProfilePage() {
  const { user, isLoading } = useAuthStore();
  const { student, loading: studentLoading } = useCurrentStudent();

  if (isLoading || studentLoading || !user) return <LoadingSpinner />;

  const className = student?.class?.name ?? '—';

  // Teacher first/last names live on teacher.user, not directly on the teacher.
  const teacherUser = student?.class?.teacher?.user;
  const teacherName = teacherUser?.firstName
    ? `${teacherUser.firstName} ${teacherUser.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Profile" description="Your account details." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>{' '}
            {user.firstName} {user.lastName}
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </div>
          <div>
            <span className="text-muted-foreground">Class:</span> {className}
          </div>
          {teacherName && (
            <div>
              <span className="text-muted-foreground">Teacher:</span> {teacherName}
            </div>
          )}
          <div className="pt-2">
            <Link href="/auth/reset-password">
              <Button variant="outline" size="sm">
                Change password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
