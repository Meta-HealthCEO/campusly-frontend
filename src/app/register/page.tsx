'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { GraduationCap, Loader2, Building2, UserCog, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerSchema, type RegisterFormData } from '@/lib/validations/index';
import { SA_PROVINCES } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Registration data:', data);
      toast.success('School registered successfully! Please sign in.');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2563EB]/5 via-white to-[#4F46E5]/5 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563EB]/10">
            <GraduationCap className="h-8 w-8 text-[#2563EB]" />
          </div>
          <CardTitle className="text-2xl">Register your school</CardTitle>
          <CardDescription>
            Set up your Campusly account in just a few minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* School Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Building2 className="h-4 w-4 text-[#2563EB]" />
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
                    <p className="text-sm text-[#EF4444]">{errors.schoolName.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.phone.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.schoolType.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <UserCog className="h-4 w-4 text-[#4F46E5]" />
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
                    <p className="text-sm text-[#EF4444]">{errors.adminFirstName.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.adminLastName.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.adminEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Min. 8 characters"
                    {...register('adminPassword')}
                    aria-invalid={!!errors.adminPassword}
                    className="h-10"
                  />
                  {errors.adminPassword && (
                    <p className="text-sm text-[#EF4444]">{errors.adminPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...register('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    className="h-10"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-[#EF4444]">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-[#F97316]" />
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
                    <p className="text-sm text-[#EF4444]">{errors.address.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.city.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.province.message}</p>
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
                    <p className="text-sm text-[#EF4444]">{errors.postalCode.message}</p>
                  )}
                </div>
              </div>
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
                'Register School'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-[#2563EB] hover:text-[#1d4ed8]"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
