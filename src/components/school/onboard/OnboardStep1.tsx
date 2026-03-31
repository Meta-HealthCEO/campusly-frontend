'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SA_PROVINCES } from '@/lib/constants';
import type { WizardData } from './types';

interface Props {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function OnboardStep1({ data, update }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
        <Label>School Name</Label>
        <Input
          value={data.schoolName}
          onChange={(e) => update({ schoolName: e.target.value })}
          placeholder="e.g. Riverside Academy"
        />
      </div>
      <div className="space-y-1.5">
        <Label>City</Label>
        <Input
          value={data.city}
          onChange={(e) => update({ city: e.target.value })}
          placeholder="Cape Town"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Province</Label>
        <Select
          value={data.province}
          onValueChange={(v) => {
            if (v) update({ province: v });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent>
            {SA_PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
          placeholder="012 000 0000"
        />
      </div>
      <div className="space-y-1.5">
        <Label>School Type</Label>
        <Select
          value={data.schoolType || 'combined'}
          onValueChange={(v) => {
            if (v) update({ schoolType: v });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
            <SelectItem value="special">Special</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
