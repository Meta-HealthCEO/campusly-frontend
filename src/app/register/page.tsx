'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';
import type { RegisterFormData } from '@/lib/validations/index';
import apiClient from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email: data.adminEmail,
        password: data.adminPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        role: 'school_admin',
        phone: data.phone,
      });
      toast.success(
        'Account created! The Campusly team will set up your school. Please sign in.'
      );
      router.push('/login');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Register your school"
        description="Set up your Campusly account in just a few minutes"
        maxWidth="2xl"
      >
        <RegisterForm onSubmit={onSubmit} isLoading={isLoading} />
      </AuthCard>
    </AuthLayout>
  );
}
