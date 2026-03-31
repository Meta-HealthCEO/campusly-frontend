'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
  isLoading: boolean;
  submitted: boolean;
}

export function ForgotPasswordForm({
  onSubmit,
  isLoading,
  submitted,
}: ForgotPasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Mail className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-center text-sm text-gray-600">
          If an account exists with that email, you will receive a password reset
          link shortly. Please check your spam folder if you don&apos;t see it.
        </p>
        <Link href="/login" className="block">
          <Button variant="outline" className="w-full" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@school.co.za"
            {...register('email')}
            aria-invalid={!!errors.email}
            className="h-10"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to login
        </Link>
      </div>
    </>
  );
}
