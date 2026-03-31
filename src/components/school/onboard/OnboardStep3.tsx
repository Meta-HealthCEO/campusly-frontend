'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WizardData } from './types';

interface Props {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function OnboardStep3({ data, update }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>First Name</Label>
        <Input
          value={data.adminFirstName}
          onChange={(e) => update({ adminFirstName: e.target.value })}
          placeholder="Thabo"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Last Name</Label>
        <Input
          value={data.adminLastName}
          onChange={(e) => update({ adminLastName: e.target.value })}
          placeholder="Molefe"
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Email</Label>
        <Input
          type="email"
          value={data.adminEmail}
          onChange={(e) => update({ adminEmail: e.target.value })}
          placeholder="admin@school.edu.za"
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Temporary Password</Label>
        <Input
          type="password"
          value={data.adminPassword}
          onChange={(e) => update({ adminPassword: e.target.value })}
          placeholder="Min 8 characters"
        />
      </div>
    </div>
  );
}
