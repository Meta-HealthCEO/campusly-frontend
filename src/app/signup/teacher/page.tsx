'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useStandaloneSignup } from '@/hooks/useStandaloneSignup';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function TeacherSignupPage() {
  const router = useRouter();
  const { signup, loading, error } = useStandaloneSignup();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      toast.success('Account created! Welcome to Campusly.');
      router.push('/teacher/onboarding');
    } catch {
      // error already set in hook
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Start teaching with Campusly"
        description="Create your free teacher account in 30 seconds"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name <span className="text-destructive">*</span></Label>
              <Input
                id="firstName"
                placeholder="Jane"
                {...register('firstName', { required: 'First name is required' })}
                aria-invalid={!!errors.firstName}
                className="h-10"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name <span className="text-destructive">*</span></Label>
              <Input
                id="lastName"
                placeholder="Smith"
                {...register('lastName', { required: 'Last name is required' })}
                aria-invalid={!!errors.lastName}
                className="h-10"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@school.co.za"
              {...register('email', { required: 'Email is required' })}
              aria-invalid={!!errors.email}
              className="h-10"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <PasswordInput
              id="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              registration={register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password <span className="text-destructive">*</span></Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === watch('password') || 'Passwords do not match',
              })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create my classroom'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
