'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MODULES, SA_PROVINCES } from '@/lib/constants';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'School Details' },
  { id: 2, label: 'Modules' },
  { id: 3, label: 'Admin User' },
  { id: 4, label: 'Subscription' },
  { id: 5, label: 'Review' },
];

interface WizardData {
  schoolName: string;
  city: string;
  province: string;
  phone: string;
  schoolType: string;
  modules: string[];
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  tier: string;
}

const DEFAULT_DATA: WizardData = {
  schoolName: '',
  city: '',
  province: '',
  phone: '',
  schoolType: 'combined',
  modules: ['fees', 'communication'],
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
  tier: 'starter',
};

const TIER_PRICES: Record<string, string> = {
  starter: 'R2,999/mo',
  growth: 'R7,999/mo',
  enterprise: 'R14,999/mo',
};

export default function SuperAdminOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [done, setDone] = useState(false);

  const update = (patch: Partial<WizardData>) => setData((prev) => ({ ...prev, ...patch }));

  const toggleModule = (id: string) => {
    setData((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }));
  };

  const handleSubmit = () => {
    toast.success(`${data.schoolName} has been onboarded successfully!`);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{data.schoolName} is live!</h2>
          <p className="text-muted-foreground mt-1">The school has been onboarded on the {data.tier} plan.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/superadmin/schools')}>
            View Schools
          </Button>
          <Button onClick={() => { setStep(1); setData(DEFAULT_DATA); setDone(false); }}>
            Onboard Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Onboard New School" description="Set up a new tenant school in 5 steps" />

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                step > s.id
                  ? 'bg-emerald-500 text-white'
                  : step === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={() => step > s.id && setStep(s.id)}
            >
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5', step > s.id ? 'bg-emerald-500' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">{STEPS[step - 1].label}</p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Step 1: School Details */}
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>School Name</Label>
                  <Input value={data.schoolName} onChange={(e) => update({ schoolName: e.target.value })} placeholder="e.g. Riverside Academy" />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={data.city} onChange={(e) => update({ city: e.target.value })} placeholder="Cape Town" />
                </div>
                <div className="space-y-1.5">
                  <Label>Province</Label>
                  <Select value={data.province} onValueChange={(v) => update({ province: v ?? '' })}>
                    <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                    <SelectContent>
                      {SA_PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={data.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="012 000 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label>School Type</Label>
                  <Select value={data.schoolType || 'combined'} onValueChange={(v) => { if (v) update({ schoolType: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="combined">Combined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Modules */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select which modules to enable for this school</p>
              {MODULES.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={data.modules.includes(mod.id)}
                    onCheckedChange={() => toggleModule(mod.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Admin User */}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={data.adminFirstName} onChange={(e) => update({ adminFirstName: e.target.value })} placeholder="Thabo" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={data.adminLastName} onChange={(e) => update({ adminLastName: e.target.value })} placeholder="Molefe" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={data.adminEmail} onChange={(e) => update({ adminEmail: e.target.value })} placeholder="admin@school.edu.za" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Temporary Password</Label>
                <Input type="password" value={data.adminPassword} onChange={(e) => update({ adminPassword: e.target.value })} placeholder="Min 8 characters" />
              </div>
            </div>
          )}

          {/* Step 4: Subscription */}
          {step === 4 && (
            <div className="space-y-3">
              {(['starter', 'growth', 'enterprise'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => update({ tier })}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    data.tier === tier ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold capitalize">{tier}</p>
                    <p className="font-bold text-primary">{TIER_PRICES[tier]}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tier === 'starter' && 'Up to 150 students, core modules only'}
                    {tier === 'growth' && 'Up to 500 students, all modules included'}
                    {tier === 'enterprise' && 'Unlimited students, priority support, custom branding'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="font-semibold text-sm">School</p>
                <p>{data.schoolName} — {data.city}, {data.province}</p>
                <p className="text-muted-foreground text-sm">{data.schoolType} school</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="font-semibold text-sm">Admin User</p>
                <p>{data.adminFirstName} {data.adminLastName}</p>
                <p className="text-muted-foreground text-sm">{data.adminEmail}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="font-semibold text-sm">Modules ({data.modules.length})</p>
                <p className="text-sm text-muted-foreground">{data.modules.join(', ') || 'None selected'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                <p className="font-semibold text-sm">Plan</p>
                <p className="capitalize">{data.tier} — {TIER_PRICES[data.tier]}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(s => s + 1)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
            Confirm & Onboard
          </Button>
        )}
      </div>
    </div>
  );
}
