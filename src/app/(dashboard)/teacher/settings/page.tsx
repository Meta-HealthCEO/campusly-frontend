'use client';

import Link from 'next/link';
import {
  Building2, UserRound, BookOpen, Mail, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { TeachingScopePicker } from '@/components/curriculum/TeachingScopePicker';

export default function TeacherSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const school = useSchoolStore((state) => state.school);
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;

  // Standalone teachers' main job here is to set their teaching scope, so
  // land them on Teaching by default. School teachers don't have scope to
  // configure (curriculum is school-managed) — Profile is more useful.
  const defaultTab = isStandaloneTeacher ? 'teaching' : 'profile';

  const fullName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Teacher'
    : 'Teacher';

  const roleLabel = isStandaloneTeacher
    ? 'Standalone Teacher'
    : user?.isSchoolPrincipal
      ? 'Principal'
      : user?.isHOD
        ? 'Head of Department'
        : 'Teacher';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={isStandaloneTeacher
          ? 'Manage your teaching scope, profile, and school connection.'
          : 'Manage your profile and account preferences.'}
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <UserRound className="mr-2 h-4 w-4" /> Profile
          </TabsTrigger>
          {isStandaloneTeacher && (
            <TabsTrigger value="teaching">
              <BookOpen className="mr-2 h-4 w-4" /> Teaching
            </TabsTrigger>
          )}
          <TabsTrigger value="school">
            <Building2 className="mr-2 h-4 w-4" /> School
          </TabsTrigger>
        </TabsList>

        {/* ── Profile ───────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <SettingRow
                icon={<UserRound className="h-4 w-4 text-muted-foreground" />}
                label="Name"
                value={fullName}
              />
              <SettingRow
                icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                label="Email"
                value={user?.email ?? '—'}
              />
              <SettingRow
                icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                label="Role"
                value={<Badge variant="outline">{roleLabel}</Badge>}
              />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground px-1">
            Profile editing will land in a future release. Reach out to support
            if you need a name or email change in the meantime.
          </p>
        </TabsContent>

        {/* ── Teaching (standalone only) ────────────────────────────── */}
        {isStandaloneTeacher && (
          <TabsContent value="teaching" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Teaching scope</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pick the grades and subjects you teach. This drives the
                  curriculum tree, the AI paper generator, and what shows up
                  on your dashboard.
                </p>
              </CardHeader>
              <CardContent>
                <TeachingScopePicker />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── School ────────────────────────────────────────────────── */}
        <TabsContent value="school" className="space-y-4 mt-4">
          {isStandaloneTeacher ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Join a school</CardTitle>
                <p className="text-sm text-muted-foreground">
                  If your school invites you, paste the join code here to link
                  this workspace to their account. Your existing lessons,
                  papers, and bank stay with you.
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/teacher/settings/join-school">
                  <Button variant="outline">
                    <Building2 className="mr-2 h-4 w-4" />
                    Enter join code
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">School</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <SettingRow
                  icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                  label="School"
                  value={school?.name ?? '—'}
                />
                {school?.address && (
                  <SettingRow
                    label="Address"
                    value={[school.address.street, school.address.city]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SettingRowProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function SettingRow({ icon, label, value }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right truncate max-w-[60%]">
        {value}
      </div>
    </div>
  );
}
