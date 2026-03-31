'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, MapPin, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { SA_PROVINCES } from '@/lib/constants';

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading: boolean;
}

export function RegisterForm({ onSubmit, isLoading }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      schoolName: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      schoolType: 'primary',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* School Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="h-4 w-4 text-blue-600" />
          School Information
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              placeholder="e.g. Greenfield Primary School"
              {...register('schoolName')}
              aria-invalid={!!errors.schoolName}
              className="h-10"
            />
            {errors.schoolName && (
              <p className="text-sm text-destructive">{errors.schoolName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="011 123 4567"
              {...register('phone')}
              aria-invalid={!!errors.phone}
              className="h-10"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolType">School Type</Label>
            <select
              id="schoolType"
              {...register('schoolType')}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School</option>
              <option value="combined">Combined School</option>
            </select>
            {errors.schoolType && (
              <p className="text-sm text-destructive">{errors.schoolType.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Account */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserCog className="h-4 w-4 text-indigo-600" />
          Admin Account
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adminFirstName">First Name</Label>
            <Input
              id="adminFirstName"
              placeholder="First name"
              {...register('adminFirstName')}
              aria-invalid={!!errors.adminFirstName}
              className="h-10"
            />
            {errors.adminFirstName && (
              <p className="text-sm text-destructive">{errors.adminFirstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminLastName">Last Name</Label>
            <Input
              id="adminLastName"
              placeholder="Last name"
              {...register('adminLastName')}
              aria-invalid={!!errors.adminLastName}
              className="h-10"
            />
            {errors.adminLastName && (
              <p className="text-sm text-destructive">{errors.adminLastName.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adminEmail">Email Address</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@school.co.za"
              {...register('adminEmail')}
              aria-invalid={!!errors.adminEmail}
              className="h-10"
            />
            {errors.adminEmail && (
              <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <PasswordInput
              id="adminPassword"
              placeholder="Min. 8 characters"
              error={errors.adminPassword?.message}
              registration={register('adminPassword')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <MapPin className="h-4 w-4 text-orange-500" />
          School Address
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              placeholder="123 Main Road"
              {...register('address')}
              aria-invalid={!!errors.address}
              className="h-10"
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City / Town</Label>
            <Input
              id="city"
              placeholder="e.g. Johannesburg"
              {...register('city')}
              aria-invalid={!!errors.city}
              className="h-10"
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <select
              id="province"
              {...register('province')}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select province</option>
              {SA_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {errors.province && (
              <p className="text-sm text-destructive">{errors.province.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="2000"
              {...register('postalCode')}
              aria-invalid={!!errors.postalCode}
              className="h-10"
            />
            {errors.postalCode && (
              <p className="text-sm text-destructive">{errors.postalCode.message}</p>
            )}
          </div>
        </div>
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
            Creating your account...
          </>
        ) : (
          'Register School'
        )}
      </Button>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </div>
    </form>
  );
}
