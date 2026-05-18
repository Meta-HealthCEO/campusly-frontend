'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  AlertTriangle,
  Building2,
  Cake,
  Calendar,
  ChevronRight,
  GraduationCap,
  Hash,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  Monitor,
  Moon,
  School,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { getInitials } from '@/lib/utils';
import { resolveClassName, resolveGradeLevel, resolveGradeName } from '@/lib/student-helpers';

export default function StudentProfilePage() {
  const { user, isLoading } = useAuthStore();
  const school = useSchoolStore((state) => state.school);
  const { student, loading: studentLoading } = useCurrentStudent();
  const { homeroom, loading: classesLoading } = useStudentClasses();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (isLoading || studentLoading || classesLoading || !user) return <LoadingSpinner />;

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Student';
  const initials = getInitials(user.firstName, user.lastName);

  const gradeLevel = resolveGradeLevel(student, homeroom);
  const gradeName = resolveGradeName(student, homeroom) || 'Grade not set';
  const className = resolveClassName(student, homeroom) || 'No class joined';
  const hasGrade = gradeLevel >= 1;
  const teacherName = homeroom
    ? `${homeroom.teacher.firstName} ${homeroom.teacher.lastName}`.trim()
    : null;
  const classroomCode = homeroom?.classroomCode ?? null;
  const schoolName = school?.name ?? '-';

  const enrolledAt = student?.enrollmentDate ? new Date(student.enrollmentDate) : null;
  const memberSince = enrolledAt
    ? enrolledAt.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
    : '-';

  const dob = student?.dateOfBirth ? new Date(student.dateOfBirth) : null;
  const dobLabel = dob
    ? dob.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const languages = [
    ...(student?.homeLanguage ? [student.homeLanguage] : []),
    ...(student?.additionalLanguages ?? []),
  ];
  const previousSchool = student?.previousSchool ?? null;
  const hasAbout = Boolean(dobLabel || languages.length > 0 || previousSchool || hasGrade);

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Who you are at school." />

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="relative shrink-0">
            <div
              className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-transparent blur-md"
              aria-hidden
            />
            <Avatar className="relative h-24 w-24 ring-2 ring-primary/30 ring-offset-2 ring-offset-background sm:h-28 sm:w-28">
              {student?.photoUrl && <AvatarImage src={student.photoUrl} alt={fullName} />}
              <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary sm:text-3xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasGrade ? 'secondary' : 'outline'} className="gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {gradeName}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                {className}
              </Badge>
              <Badge variant="outline" className="max-w-[180px] gap-1">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{schoolName}</span>
              </Badge>
            </div>
            {enrolledAt && (
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Member since {memberSince}
              </p>
            )}
          </div>

          {student?.admissionNumber && (
            <div className="hidden self-stretch border-l border-primary/15 pl-6 sm:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Admission no.
              </p>
              <p className="font-mono text-sm font-semibold">{student.admissionNumber}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!hasGrade && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Your learning level is not set yet
                </p>
                <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                  Aura uses your teaching group grade to teach at the right level. Join a class
                  with your teacher&apos;s code, or ask your teacher to move you into the correct group.
                </p>
              </div>
            </div>
            <Link href="/student/classes" className="shrink-0">
              <Button variant="outline" size="sm" className="border-amber-500/50 bg-background/80">
                Open my classes
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasAbout ? (
              <div className="divide-y">
                {hasGrade && (
                  <DetailRow
                    icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
                    label="Aura level"
                    value={`Grade ${gradeLevel}`}
                  />
                )}
                {dobLabel && (
                  <DetailRow
                    icon={<Cake className="h-4 w-4 text-muted-foreground" />}
                    label="Date of birth"
                    value={dobLabel}
                  />
                )}
                {languages.length > 0 && (
                  <DetailRow
                    icon={<Languages className="h-4 w-4 text-muted-foreground" />}
                    label={languages.length > 1 ? 'Languages' : 'Language'}
                    value={languages.join(', ')}
                  />
                )}
                {previousSchool && (
                  <DetailRow
                    icon={<School className="h-4 w-4 text-muted-foreground" />}
                    label="Previous school"
                    value={previousSchool}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No personal details on file. Speak to your school administrator to add them.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {className !== 'No class joined' ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Class</p>
                  <p className="text-lg font-semibold">{className}</p>
                  <p className="text-sm text-muted-foreground">
                    {gradeName}
                    {hasGrade ? ` - Aura level ${gradeLevel}` : ''}
                  </p>
                </div>
                {teacherName && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Class teacher
                    </p>
                    <p className="text-sm font-medium">{teacherName}</p>
                  </div>
                )}
                {classroomCode && (
                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Class code
                    </span>
                    <span className="font-mono text-sm tracking-wider">{classroomCode}</span>
                  </div>
                )}
                <Link
                  href="/student/classes"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View all classes
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t joined a class yet. Use the join card in My Classes with the code
                from your teacher.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Pick how the app looks. System follows your device setting.
            </p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <DetailRow
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              label="Email"
              value={user.email}
            />
            {student?.admissionNumber && (
              <DetailRow
                icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                label="Admission no."
                value={<span className="font-mono">{student.admissionNumber}</span>}
              />
            )}
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              label="Member since"
              value={memberSince}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Manage your password and session here.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/forgot-password" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full text-destructive hover:text-destructive sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="max-w-[60%] truncate text-right text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

interface ThemeOptionProps {
  icon: ReactNode;
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
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
