'use client';

import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useAuth } from '@/hooks/useAuth';
import type { ForgotPasswordFormData } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
    } catch {
      // Intentionally swallow errors to prevent email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  const description = submitted
    ? 'Check your email for a password reset link.'
    : "Enter your email and we'll send you a reset link.";

  return (
    <AuthLayout>
      <AuthCard title="Reset your password" description={description}>
        <ForgotPasswordForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          submitted={submitted}
        />
      </AuthCard>
    </AuthLayout>
  );
}
