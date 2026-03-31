'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from './PasswordInput';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one digit'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onSubmit: (data: ResetPasswordFormData) => Promise<void>;
  isLoading: boolean;
}

export function ResetPasswordForm({ onSubmit, isLoading }: ResetPasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            registration={register('password')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Repeat your new password"
            error={errors.confirmPassword?.message}
            registration={register('confirmPassword')}
          />
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
              Resetting...
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/forgot-password"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Request a new reset link
        </Link>
      </div>
    </>
  );
}
