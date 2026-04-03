'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChildDetailsStep,
  ParentDetailsStep,
  AddressMedicalStep,
  type FormData,
} from './ApplicationFormSteps';
import { DocumentUploadStep, type FileState } from './DocumentUploadStep';
import { ReviewStep } from './ReviewStep';
import type { AdmissionSubmitResponse } from '@/types/admissions';

const STEP_LABELS = ['Child Details', 'Parent Details', 'Address & Medical', 'Documents', 'Review'];

const EMPTY_FORM: FormData = {
  applicantFirstName: '', applicantLastName: '', dateOfBirth: '', gender: '',
  gradeApplyingFor: '', yearApplyingFor: '', previousSchool: '',
  parentFirstName: '', parentLastName: '', parentEmail: '', parentPhone: '',
  parentIdNumber: '', parentRelationship: '',
  street: '', city: '', province: '', postalCode: '',
  medicalConditions: '', allergies: '', specialNeeds: '', additionalNotes: '',
};

interface Props {
  schoolId: string;
  onSubmit: (formData: globalThis.FormData) => Promise<AdmissionSubmitResponse>;
  submitting: boolean;
}

export function ApplicationForm({ schoolId, onSubmit, submitting }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [files, setFiles] = useState<FileState>({
    birthCertificate: null,
    previousReportCard: null,
    proofOfResidence: null,
  });
  const [result, setResult] = useState<AdmissionSubmitResponse | null>(null);

  const onChange = (field: keyof FormData, value: string) => {
    setForm((prev: FormData) => ({ ...prev, [field]: value }));
  };

  const onFileChange = (field: keyof FileState, file: File | null) => {
    setFiles((prev: FileState) => ({ ...prev, [field]: file }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!(form.applicantFirstName && form.applicantLastName && form.dateOfBirth && form.gradeApplyingFor && form.yearApplyingFor);
      case 1: return !!(form.parentFirstName && form.parentLastName && form.parentEmail && form.parentPhone);
      case 2: return !!(form.street && form.city && form.province && form.postalCode);
      case 3: return !!(files.birthCertificate && files.proofOfResidence);
      default: return true;
    }
  };

  const handleSubmit = async () => {
    const fd = new globalThis.FormData();
    fd.append('schoolId', schoolId);
    fd.append('applicantFirstName', form.applicantFirstName);
    fd.append('applicantLastName', form.applicantLastName);
    fd.append('dateOfBirth', form.dateOfBirth);
    if (form.gender) fd.append('gender', form.gender);
    fd.append('gradeApplyingFor', form.gradeApplyingFor);
    fd.append('yearApplyingFor', form.yearApplyingFor);
    if (form.previousSchool) fd.append('previousSchool', form.previousSchool);
    fd.append('parentFirstName', form.parentFirstName);
    fd.append('parentLastName', form.parentLastName);
    fd.append('parentEmail', form.parentEmail);
    fd.append('parentPhone', form.parentPhone);
    if (form.parentIdNumber) fd.append('parentIdNumber', form.parentIdNumber);
    if (form.parentRelationship) fd.append('parentRelationship', form.parentRelationship);
    fd.append('address[street]', form.street);
    fd.append('address[city]', form.city);
    fd.append('address[province]', form.province);
    fd.append('address[postalCode]', form.postalCode);
    if (form.medicalConditions) fd.append('medicalConditions', form.medicalConditions);
    if (form.allergies) fd.append('allergies', form.allergies);
    if (form.specialNeeds) fd.append('specialNeeds', form.specialNeeds);
    if (form.additionalNotes) fd.append('additionalNotes', form.additionalNotes);
    if (files.birthCertificate) fd.append('birthCertificate', files.birthCertificate);
    if (files.previousReportCard) fd.append('previousReportCard', files.previousReportCard);
    if (files.proofOfResidence) fd.append('proofOfResidence', files.proofOfResidence);

    try {
      const res = await onSubmit(fd);
      setResult(res);
    } catch {
      // error handled by parent hook
    }
  };

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-4xl">&#127881;</div>
          <h2 className="text-xl font-bold">Application Submitted!</h2>
          <p className="text-muted-foreground">
            Application Number: <strong>{result.applicationNumber}</strong>
          </p>
          <p className="text-muted-foreground">
            Tracking Token: <strong className="font-mono">{result.trackingToken}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Save your tracking token to check your application status at any time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-1">
          {STEP_LABELS.map((label: string, i: number) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs mt-1 hidden sm:block ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {step === 0 && <ChildDetailsStep form={form} onChange={onChange} />}
        {step === 1 && <ParentDetailsStep form={form} onChange={onChange} />}
        {step === 2 && <AddressMedicalStep form={form} onChange={onChange} />}
        {step === 3 && <DocumentUploadStep files={files} onFileChange={onFileChange} />}
        {step === 4 && <ReviewStep form={form} files={files} />}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep((s: number) => s - 1)} disabled={step === 0}>
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s: number) => s + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
