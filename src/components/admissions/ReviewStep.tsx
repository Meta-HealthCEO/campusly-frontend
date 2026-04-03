'use client';

import { FileText } from 'lucide-react';
import type { FormData } from './ApplicationFormSteps';
import type { FileState } from './DocumentUploadStep';

function gradeLabel(grade: string): string {
  return grade === '0' ? 'Grade R' : `Grade ${grade}`;
}

interface Props {
  form: FormData;
  files: FileState;
}

export function ReviewStep({ form, files }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review Your Application</h3>
      <p className="text-sm text-muted-foreground">
        Please review all details before submitting. You will not be able to edit after submission.
      </p>

      <Section title="Child Details">
        <Row label="Name" value={`${form.applicantFirstName} ${form.applicantLastName}`} />
        <Row label="Date of Birth" value={form.dateOfBirth} />
        {form.gender && <Row label="Gender" value={form.gender} />}
        <Row label="Grade" value={gradeLabel(form.gradeApplyingFor)} />
        <Row label="Year" value={form.yearApplyingFor} />
        {form.previousSchool && <Row label="Previous School" value={form.previousSchool} />}
      </Section>

      <Section title="Parent / Guardian">
        <Row label="Name" value={`${form.parentFirstName} ${form.parentLastName}`} />
        <Row label="Email" value={form.parentEmail} />
        <Row label="Phone" value={form.parentPhone} />
        {form.parentRelationship && <Row label="Relationship" value={form.parentRelationship} />}
      </Section>

      <Section title="Address">
        <p className="text-sm">{form.street}</p>
        <p className="text-sm">{form.city}, {form.province} {form.postalCode}</p>
      </Section>

      {(form.medicalConditions || form.allergies || form.specialNeeds) && (
        <Section title="Medical">
          {form.medicalConditions && <Row label="Conditions" value={form.medicalConditions} />}
          {form.allergies && <Row label="Allergies" value={form.allergies} />}
          {form.specialNeeds && <Row label="Special Needs" value={form.specialNeeds} />}
        </Section>
      )}

      <Section title="Documents">
        <FileRow label="Birth Certificate" file={files.birthCertificate} />
        <FileRow label="Report Card" file={files.previousReportCard} />
        <FileRow label="Proof of Residence" file={files.proofOfResidence} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3 space-y-1">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function FileRow({ label, file }: { label: string; file: File | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={file ? 'font-medium' : 'text-muted-foreground italic'}>
        {file ? file.name : 'Not uploaded'}
      </span>
    </div>
  );
}
