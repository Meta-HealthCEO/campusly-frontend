'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  UserRound, Mail, ShieldCheck, GraduationCap, Building2, Moon, Sun, Monitor, KeyRound, LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { getRoleLabel } from '@/lib/auth';

export default function StudentSettingsPage() {
  const { user, isLoading } = useAuthStore();
  const school = useSchoolStore((state) => state.school);
  const { student, loading: studentLoading } = useCurrentStudent();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (isLoading || studentLoading || !user) return <LoadingSpinner />;

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Student';
  const className = student?.class?.name ?? '—';
  const schoolName = school?.name ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and security."
      />

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">
            <UserRound className="mr-2 h-4 w-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Sun className="mr-2 h-4 w-4" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* ── Account ──────────────────────────────────────────────── */}
        <TabsContent value="account" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account details</CardTitle>
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
                value={user.email}
              />
              <SettingRow
                icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                label="Role"
                value={<Badge variant="outline">{getRoleLabel(user.role)}</Badge>}
              />
              <SettingRow
                icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
                label="Class"
                value={className}
              />
              <SettingRow
                icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                label="School"
                value={schoolName}
              />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground px-1">
            Profile edits are managed by your school administrator. Speak to your homeroom teacher if anything is wrong.
          </p>
        </TabsContent>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ThemeOption
                  icon={<Sun className="h-4 w-4" />}
                  label="Light"
                  active={theme === 'light'}
                  onClick={() => setTheme('light')}
                />
                <ThemeOption
                  icon={<Moon className="h-4 w-4" />}
                  label="Dark"
                  active={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                />
                <ThemeOption
                  icon={<Monitor className="h-4 w-4" />}
                  label="System"
                  active={theme === 'system' || theme === undefined}
                  onClick={() => setTheme('system')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ─────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Reset your password from the forgot-password flow. You will receive a reset link by email.
              </p>
              <Link href="/forgot-password">
                <Button variant="outline" size="sm">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset password
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign out</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You will be signed out on this device. Your data is unaffected.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
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

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ThemeOption({ icon, label, active, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary font-medium'
          : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
