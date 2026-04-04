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
import { teacherRegisterSchema, type TeacherRegisterFormData } from '@/lib/validations';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterTeacherPage() {
  const { registerTeacher } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherRegisterFormData>({
    resolver: zodResolver(teacherRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      schoolName: '',
    },
  });

  const onSubmit = async (data: TeacherRegisterFormData) => {
    setIsLoading(true);
    try {
      await registerTeacher({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        schoolName: data.schoolName || undefined,
      });
      toast.success('Account created! Let\'s set up your classroom.');
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error
        ?? (error instanceof Error ? error.message : 'Registration failed. Please try again.');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Start teaching with Campusly"
        description="Create your free teacher account in under a minute"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="First name"
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
                className="h-10"
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
                placeholder="Last name"
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
                className="h-10"
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
              placeholder="teacher@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
              className="h-10"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <PasswordInput
                id="password"
                placeholder="Min. 8 characters"
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
                placeholder="Re-enter password"
                error={errors.confirmPassword?.message}
                registration={register('confirmPassword')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolName">
              School / Classroom Name{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="schoolName"
              placeholder="e.g. Mrs Smith's Grade 4 Class"
              {...register('schoolName')}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use &quot;Your Name&apos;s Classroom&quot;
            </p>
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
                Creating your account...
              </>
            ) : (
              'Create My Account'
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#2563EB] hover:text-[#1d4ed8]">
              Sign in
            </Link>
          </p>
          <p>
            Registering a school?{' '}
            <Link href="/register" className="font-medium text-[#2563EB] hover:text-[#1d4ed8]">
              School registration
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
