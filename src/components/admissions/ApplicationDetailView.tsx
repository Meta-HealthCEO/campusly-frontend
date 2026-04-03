'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StatusTimeline } from './StatusTimeline';
import { FileText, Calendar, ExternalLink } from 'lucide-react';
import type { AdmissionApplication } from '@/types/admissions';

interface Props {
  application: AdmissionApplication;
  onScheduleInterview: () => void;
  onBack: () => void;
}

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ApplicationDetailView({ application: app, onScheduleInterview, onBack }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            &larr; Back to Pipeline
          </Button>
          <h2 className="text-xl font-bold">
            {app.applicantFirstName} {app.applicantLastName}
          </h2>
          <p className="text-sm text-muted-foreground">{app.applicationNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <ApplicationStatusBadge status={app.status} />
          {(app.status === 'under_review' || app.status === 'interview_scheduled') && (
            <Button size="sm" onClick={onScheduleInterview}>
              <Calendar className="h-4 w-4 mr-1" />
              Schedule Interview
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Applicant Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Grade" value={gradeLabel(app.gradeApplyingFor)} />
            <Row label="Year" value={String(app.yearApplyingFor)} />
            <Row label="Date of Birth" value={formatDate(app.dateOfBirth)} />
            {app.gender && <Row label="Gender" value={app.gender} />}
            {app.previousSchool && <Row label="Previous School" value={app.previousSchool} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parent / Guardian</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={`${app.parentFirstName} ${app.parentLastName}`} />
            <Row label="Email" value={app.parentEmail} />
            <Row label="Phone" value={app.parentPhone} />
            {app.parentRelationship && <Row label="Relationship" value={app.parentRelationship} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>{app.address.street}</p>
            <p>{app.address.city}, {app.address.province}</p>
            <p>{app.address.postalCode}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DocLink label="Birth Certificate" doc={app.documents.birthCertificate} />
            <DocLink label="Previous Report Card" doc={app.documents.previousReportCard} />
            <DocLink label="Proof of Residence" doc={app.documents.proofOfResidence} />
          </CardContent>
        </Card>

        {(app.medicalConditions || app.allergies || app.specialNeeds) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Medical / Special Needs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {app.medicalConditions && <Row label="Conditions" value={app.medicalConditions} />}
              {app.allergies && <Row label="Allergies" value={app.allergies} />}
              {app.specialNeeds && <Row label="Special Needs" value={app.specialNeeds} />}
            </CardContent>
          </Card>
        )}

        {app.interviewDate && (
          <Card>
            <CardHeader><CardTitle className="text-base">Interview</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Date" value={formatDateTime(app.interviewDate)} />
              {app.interviewType && <Row label="Type" value={app.interviewType === 'in_person' ? 'In Person' : 'Virtual'} />}
              {app.interviewerName && <Row label="Interviewer" value={app.interviewerName} />}
              {app.interviewVenue && <Row label="Venue" value={app.interviewVenue} />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
          <CardContent>
            <StatusTimeline history={app.statusHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate ml-2">{value}</span>
    </div>
  );
}

function DocLink({ label, doc }: { label: string; doc?: { url: string; uploadedAt: string } }) {
  if (!doc) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{label}: Not uploaded</span>
      </div>
    );
  }
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-primary hover:underline"
    >
      <ExternalLink className="h-4 w-4" />
      <span>{label}</span>
    </a>
  );
}
