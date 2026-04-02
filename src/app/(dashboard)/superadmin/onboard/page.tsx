'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSchoolData } from '@/hooks/useSchoolData';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { OnboardStep1 } from '@/components/school/onboard/OnboardStep1';
import { OnboardStep2 } from '@/components/school/onboard/OnboardStep2';
import { OnboardStep3 } from '@/components/school/onboard/OnboardStep3';
import { OnboardStep4 } from '@/components/school/onboard/OnboardStep4';
import { OnboardStep5 } from '@/components/school/onboard/OnboardStep5';
import {
  DEFAULT_WIZARD_DATA,
  type WizardData,
} from '@/components/school/onboard/types';
import type { SchoolType } from '@/types';

const STEPS = [
  { id: 1, label: 'School Details' },
  { id: 2, label: 'Modules' },
  { id: 3, label: 'Admin User' },
  { id: 4, label: 'Subscription' },
  { id: 5, label: 'Review' },
];

export default function SuperAdminOnboardPage() {
  const router = useRouter();
  const { createSchool } = useSchoolData();
  const { registerAdmin } = useSuperAdmin();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!data.schoolName.trim()) { toast.error('School name is required'); return false; }
      if (!data.city.trim()) { toast.error('City is required'); return false; }
      if (!data.province) { toast.error('Province is required'); return false; }
      if (!data.phone.trim()) { toast.error('Phone is required'); return false; }
    }
    if (s === 3) {
      if (!data.adminFirstName.trim()) { toast.error('First name is required'); return false; }
      if (!data.adminLastName.trim()) { toast.error('Last name is required'); return false; }
      if (!data.adminEmail.trim() || !data.adminEmail.includes('@')) { toast.error('A valid email is required'); return false; }
      if (data.adminPassword.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
    }
    return true;
  };

  const toggleModule = (id: string) => {
    setData((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const school = await createSchool({
        name: data.schoolName,
        address: {
          street: '',
          city: data.city,
          province: data.province,
          postalCode: '',
          country: 'South Africa',
        },
        contactInfo: {
          email: data.adminEmail,
          phone: data.phone,
        },
        subscription: {
          tier: data.tier as 'basic' | 'standard' | 'premium',
          expiresAt: expiresAt.toISOString(),
        },
        settings: {
          academicYear: new Date().getFullYear(),
          terms: 4,
          gradingSystem: 'percentage',
        },
        modulesEnabled: data.modules,
        type: data.schoolType as SchoolType,
      });

      await registerAdmin({
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        email: data.adminEmail,
        password: data.adminPassword,
        role: 'school_admin',
        schoolId: school.id,
      });

      setDone(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Onboarding failed. Please try again.');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{data.schoolName} is live!</h2>
          <p className="text-muted-foreground mt-1">
            The school has been onboarded on the {data.tier} plan.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/superadmin/schools')}>
            View Schools
          </Button>
          <Button
            onClick={() => {
              setStep(1);
              setData(DEFAULT_WIZARD_DATA);
              setDone(false);
            }}
          >
            Onboard Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Onboard New School"
        description="Set up a new tenant school in 5 steps"
      />

      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              type="button"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                step > s.id
                  ? 'bg-emerald-500 text-white'
                  : step === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={() => {
                if (step > s.id) setStep(s.id);
              }}
            >
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn('flex-1 h-0.5', step > s.id ? 'bg-emerald-500' : 'bg-muted')}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">{STEPS[step - 1].label}</p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {step === 1 && <OnboardStep1 data={data} update={update} />}
          {step === 2 && <OnboardStep2 data={data} toggleModule={toggleModule} />}
          {step === 3 && <OnboardStep3 data={data} update={update} />}
          {step === 4 && <OnboardStep4 data={data} update={update} />}
          {step === 5 && <OnboardStep5 data={data} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < 5 ? (
          <Button onClick={() => { if (validateStep(step)) setStep((s) => s + 1); }}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Onboarding...' : 'Confirm & Onboard'}
          </Button>
        )}
      </div>
    </div>
  );
}
