'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface FormData {
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: string;
  gradeApplyingFor: string;
  yearApplyingFor: string;
  previousSchool: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  parentIdNumber: string;
  parentRelationship: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  medicalConditions: string;
  allergies: string;
  specialNeeds: string;
  additionalNotes: string;
}

interface StepProps {
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
}

// ─── Step 1: Child Details ────────────────────────────────────────────────────

export function ChildDetailsStep({ form, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Child Details</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="applicantFirstName">First Name <span className="text-destructive">*</span></Label>
          <Input id="applicantFirstName" value={form.applicantFirstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('applicantFirstName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="applicantLastName">Last Name <span className="text-destructive">*</span></Label>
          <Input id="applicantLastName" value={form.applicantLastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('applicantLastName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
          <Input id="dateOfBirth" type="date" value={form.dateOfBirth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('dateOfBirth', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(val: unknown) => { if (val) onChange('gender', val as string); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Grade Applying For <span className="text-destructive">*</span></Label>
          <Select value={form.gradeApplyingFor}
            onValueChange={(val: unknown) => { if (val) onChange('gradeApplyingFor', val as string); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select grade..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Grade R</SelectItem>
              {Array.from({ length: 12 }, (_: unknown, i: number) => (
                <SelectItem key={i + 1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Year <span className="text-destructive">*</span></Label>
          <Select value={form.yearApplyingFor}
            onValueChange={(val: unknown) => { if (val) onChange('yearApplyingFor', val as string); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select year..." /></SelectTrigger>
            <SelectContent>
              {[2026, 2027, 2028].map((y: number) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="previousSchool">Previous School</Label>
        <Input id="previousSchool" value={form.previousSchool}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('previousSchool', e.target.value)} />
      </div>
    </div>
  );
}

// ─── Step 2: Parent Details ───────────────────────────────────────────────────

export function ParentDetailsStep({ form, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Parent / Guardian Details</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parentFirstName">First Name <span className="text-destructive">*</span></Label>
          <Input id="parentFirstName" value={form.parentFirstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('parentFirstName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentLastName">Last Name <span className="text-destructive">*</span></Label>
          <Input id="parentLastName" value={form.parentLastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('parentLastName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentEmail">Email <span className="text-destructive">*</span></Label>
          <Input id="parentEmail" type="email" value={form.parentEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('parentEmail', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentPhone">Phone <span className="text-destructive">*</span></Label>
          <Input id="parentPhone" value={form.parentPhone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('parentPhone', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentIdNumber">SA ID Number</Label>
          <Input id="parentIdNumber" value={form.parentIdNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('parentIdNumber', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Select value={form.parentRelationship}
            onValueChange={(val: unknown) => { if (val) onChange('parentRelationship', val as string); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mother">Mother</SelectItem>
              <SelectItem value="father">Father</SelectItem>
              <SelectItem value="guardian">Guardian</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Address & Medical ────────────────────────────────────────────────

export function AddressMedicalStep({ form, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Address & Medical Information</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="street">Street Address <span className="text-destructive">*</span></Label>
          <Input id="street" value={form.street}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('street', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
          <Input id="city" value={form.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('city', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province <span className="text-destructive">*</span></Label>
          <Input id="province" value={form.province}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('province', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code <span className="text-destructive">*</span></Label>
          <Input id="postalCode" value={form.postalCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('postalCode', e.target.value)} />
        </div>
      </div>
      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="medicalConditions">Medical Conditions</Label>
          <Textarea id="medicalConditions" value={form.medicalConditions} rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('medicalConditions', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea id="allergies" value={form.allergies} rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('allergies', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialNeeds">Special Needs</Label>
          <Textarea id="specialNeeds" value={form.specialNeeds} rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('specialNeeds', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
