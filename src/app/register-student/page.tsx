'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { studentRegisterSchema, type StudentRegisterFormData } from '@/lib/validations';
import { codeFromSearch } from '@/lib/join-code';
import { useHydrated } from '@/hooks/useHydrated';

function RegisterStudentForm() {
  const hydrated = useHydrated();
  const { registerStudent } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      classroomCode: codeFromSearch(searchParams.get('code')),
    },
  });

  const onSubmit = async (data: StudentRegisterFormData) => {
    setIsLoading(true);
    try {
      await registerStudent({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        classroomCode: data.classroomCode.toUpperCase(),
      });
      toast.success('Welcome! You have joined your classroom.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message =
        axiosErr.response?.data?.error ??
        (err instanceof Error ? err.message : 'Registration failed. Please try again.');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Join your classroom"
        description="Enter your details and the code your teacher shared with you"
      >
        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Jane"
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              error={errors.password?.message}
              registration={register('password')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classroomCode">
              Classroom Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="classroomCode"
              placeholder="e.g. AB12CD"
              className="font-mono tracking-widest uppercase"
              {...register('classroomCode')}
              aria-invalid={!!errors.classroomCode}
              onChange={(e) => {
                // A pasted code may carry spaces or lower case: keep letters and digits, upper-cased (Review Focus 2).
                e.target.value = codeFromSearch(e.target.value);
                register('classroomCode').onChange(e);
              }}
            />
            {errors.classroomCode ? (
              <p className="text-xs text-destructive">{errors.classroomCode.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask your teacher for this 6-character code.
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!hydrated || isLoading}
            className="h-10 w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining classroom...
              </>
            ) : (
              'Join Classroom'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

function RegisterStudentFallback() {
  return (
    <AuthLayout>
      <AuthCard title="Join your classroom" description="Getting the sign-up form ready…">
        <p className="text-sm text-muted-foreground">Please wait.</p>
      </AuthCard>
    </AuthLayout>
  );
}

export default function RegisterStudentPage() {
  return (
    <Suspense fallback={<RegisterStudentFallback />}>
      <RegisterStudentForm />
    </Suspense>
  );
}
