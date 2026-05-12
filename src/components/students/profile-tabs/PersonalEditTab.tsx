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

interface Props {
  form: Partial<StudentProfileFormData>;
  onChange: (patch: Partial<StudentProfileFormData>) => void;
}

export function PersonalEditTab({ form, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <Input
          id="homeLanguage"
          value={form.homeLanguage ?? ''}
          onChange={(e) => onChange({ homeLanguage: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="previousSchool">Previous School</Label>
        <Input
          id="previousSchool"
          value={form.previousSchool ?? ''}
          onChange={(e) => onChange({ previousSchool: e.target.value })}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="additionalLanguages">Additional Languages</Label>
        <Input
          id="additionalLanguages"
          placeholder="Comma-separated, e.g. Zulu, Xhosa"
          value={(form.additionalLanguages ?? []).join(', ')}
          onChange={(e) =>
            onChange({
              additionalLanguages: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  );
}
