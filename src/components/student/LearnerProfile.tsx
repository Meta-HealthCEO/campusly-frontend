'use client';

import Link from 'next/link';
import { KeyRound, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { MyGroupsCard } from '@/components/student/MyGroupsCard';
import { JoinGroupCard } from '@/components/student/JoinGroupCard';
import { useJoinClass } from '@/hooks/useJoinClass';
import type { LearnerGroup } from '@/lib/learner-groups';

interface LearnerProfileProps {
  name: string;
  email: string;
  groups: LearnerGroup[];
  onJoined: () => void;
  onSignOut: () => void;
}

/** Profile for a standalone teacher's learner: who you are, your groups, join another (spec §2). */
export function LearnerProfile({ name, email, groups, onJoined, onSignOut }: LearnerProfileProps) {
  const { join, submitting } = useJoinClass();
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account and your groups." />
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-heading text-h3 font-semibold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Kept from the school Profile: the only way to a new password from inside the app. */}
            <Link href="/forgot-password" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}>
              <KeyRound aria-hidden /> Reset password
            </Link>
            <Button variant="outline" onClick={onSignOut} className="min-h-11"><LogOut aria-hidden /> Sign out</Button>
          </div>
        </CardContent>
      </Card>
      <MyGroupsCard groups={groups} />
      <JoinGroupCard onJoin={join} submitting={submitting} onJoined={onJoined} />
    </div>
  );
}
