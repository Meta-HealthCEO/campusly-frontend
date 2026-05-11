'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';

interface Props {
  form: Partial<StudentProfileFormData>;
  onChange: (patch: Partial<StudentProfileFormData>) => void;
}

export function ContactEditTab({ form, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="email">Portal Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          This is the student&apos;s login email for the portal.
        </p>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={form.phone ?? ''}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>
    </div>
  );
}
