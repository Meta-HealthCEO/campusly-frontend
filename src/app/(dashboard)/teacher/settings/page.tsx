'use client';

import Link from 'next/link';
import { Building2, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { TeachingScopePicker } from '@/components/curriculum/TeachingScopePicker';

export default function TeacherSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your standalone teacher workspace." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user ? `${user.firstName} ${user.lastName}` : 'Teacher'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium">{user?.email ?? ''}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              School Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link this workspace to a school later when the full school portal is ready.
            </p>
            <Link href="/teacher/settings/join-school">
              <Button variant="outline">Join School</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {isStandaloneTeacher && <TeachingScopePicker />}
    </div>
  );
}
