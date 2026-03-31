'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import type { ResetPasswordFormData } from '@/components/auth/ResetPasswordForm';
import apiClient from '@/lib/api-client';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!token) {
    redirect('/forgot-password');
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      toast.success('Password reset successfully. Please sign in.');
      router.push('/login');
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error
        ?? (error instanceof Error ? error.message : 'Reset failed. The link may have expired.');
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Set new password"
        description="Choose a strong password for your account."
      >
        {apiError && (
          <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>{apiError}</p>
            <p className="mt-1">
              <Link
                href="/forgot-password"
                className="font-medium underline hover:no-underline"
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        )}
        <ResetPasswordForm onSubmit={onSubmit} isLoading={isLoading} />
      </AuthCard>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordContent />;
}
