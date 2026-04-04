'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function RegisterStudentPage() {
  const { registerStudent } = useAuth();
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
      classroomCode: '',
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              maxLength={6}
              className="font-mono tracking-widest uppercase"
              {...register('classroomCode')}
              aria-invalid={!!errors.classroomCode}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
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
            disabled={isLoading}
            className="h-10 w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
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
          <Link href="/login" className="font-medium text-[#2563EB] hover:text-[#1d4ed8]">
            Sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
