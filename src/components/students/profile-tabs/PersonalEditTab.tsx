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
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';
import { cn } from '@/lib/utils';

interface Props {
  form: Partial<StudentProfileFormData>;
  onChange: (patch: Partial<StudentProfileFormData>) => void;
  className?: string;
}

const SOUTH_AFRICAN_HOME_LANGUAGES = [
  'Afrikaans',
  'English',
  'isiNdebele',
  'isiXhosa',
  'isiZulu',
  'Sepedi',
  'Sesotho',
  'Setswana',
  'siSwati',
  'Tshivenda',
  'Xitsonga',
];

function toLocalSaCellNumber(phone?: string): string {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (digits.startsWith('27')) return digits.slice(2, 11);
  if (digits.startsWith('0')) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

function toInternationalSaCellNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.startsWith('27')
    ? digits.slice(2, 11)
    : digits.startsWith('0')
      ? digits.slice(1, 10)
      : digits.slice(0, 9);

  return localDigits ? `+27${localDigits}` : '';
}

export function PersonalEditTab({ form, onChange, className }: Props) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <div className="space-y-1">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={form.firstName ?? ''}
          onChange={(e) => onChange({ firstName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={form.lastName ?? ''}
          onChange={(e) => onChange({ lastName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="admissionNumber">Admission Number</Label>
        <Input
          id="admissionNumber"
          placeholder="Auto-generated if blank"
          value={form.admissionNumber ?? ''}
          onChange={(e) => onChange({ admissionNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={form.dateOfBirth ?? ''}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gender">Gender</Label>
        <Select
          value={form.gender ?? 'all'}
          onValueChange={(v: unknown) =>
            onChange({ gender: v === 'all' ? undefined : (v as 'male' | 'female' | 'other') })
          }
        >
          <SelectTrigger id="gender" className="w-full">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Not specified</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="saIdNumber">SA ID Number</Label>
        <Input
          id="saIdNumber"
          value={form.saIdNumber ?? ''}
          onChange={(e) => onChange({ saIdNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="luritsNumber">LURITS Number</Label>
        <Input
          id="luritsNumber"
          value={form.luritsNumber ?? ''}
          onChange={(e) => onChange({ luritsNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="homeLanguage">Home Language</Label>
        <Select
          value={form.homeLanguage ?? 'all'}
          onValueChange={(v: unknown) =>
            onChange({ homeLanguage: v === 'all' ? undefined : String(v) })
          }
        >
          <SelectTrigger id="homeLanguage" className="w-full">
            <SelectValue placeholder="Select home language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Not specified</SelectItem>
            {SOUTH_AFRICAN_HOME_LANGUAGES.map((language) => (
              <SelectItem key={language} value={language}>
                {language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Used for portal login (optional)"
          value={form.email ?? ''}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Parent Cell Number</Label>
        <div
          data-slot="phone-input-shell"
          className="flex h-10 rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
        >
          <span
            data-slot="phone-input-prefix"
            className="flex h-full shrink-0 items-center border-r border-input px-2.5 text-sm font-medium text-muted-foreground"
          >
            +27
          </span>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="82 123 4567"
            maxLength={9}
            value={toLocalSaCellNumber(form.phone)}
            onChange={(e) => onChange({ phone: toInternationalSaCellNumber(e.target.value) })}
            className="h-full border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
