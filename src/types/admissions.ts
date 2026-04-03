// ─── Admissions Pipeline Types ────────────────────────────────────────────────

export type AdmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'interview_scheduled'
  | 'accepted'
  | 'waitlisted'
  | 'rejected';

export type ApplicationFeeStatus = 'not_required' | 'pending' | 'paid';
export type Gender = 'male' | 'female' | 'other';
export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';
export type InterviewType = 'in_person' | 'virtual';

export interface AdmissionStatusHistoryEntry {
  status: AdmissionStatus;
  date: string;
  changedBy?: string;
  notes?: string;
}

export interface AdmissionDocumentEntry {
  url: string;
  uploadedAt: string;
}

export interface AdmissionDocuments {
  birthCertificate?: AdmissionDocumentEntry;
  previousReportCard?: AdmissionDocumentEntry;
  proofOfResidence?: AdmissionDocumentEntry;
}

export interface AdmissionAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface AdmissionApplication {
  id: string;
  _id: string;
  schoolId: string;
  applicationNumber: string;
  trackingToken: string;
  status: AdmissionStatus;
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender?: Gender;
  gradeApplyingFor: number;
  yearApplyingFor: number;
  previousSchool?: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  parentIdNumber?: string;
  parentRelationship?: ParentRelationship;
  address: AdmissionAddress;
  medicalConditions?: string;
  allergies?: string;
  specialNeeds?: string;
  documents: AdmissionDocuments;
  applicationFeeStatus: ApplicationFeeStatus;
  interviewDate?: string;
  interviewType?: InterviewType;
  interviewerName?: string;
  interviewVenue?: string;
  interviewNotes?: string;
  statusHistory: AdmissionStatusHistoryEntry[];
  internalNotes?: string;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeCapacity {
  id?: string;
  _id?: string;
  grade: number;
  label: string;
  maxCapacity: number;
  currentEnrolled: number;
  pendingApplications?: number;
  availableSpots?: number;
}

export interface AdmissionSubmitResponse {
  _id: string;
  applicationNumber: string;
  status: string;
  trackingToken: string;
}

export interface AdmissionStatusCheckResponse {
  applicationNumber: string;
  applicantName: string;
  gradeApplyingFor: number;
  status: AdmissionStatus;
  statusHistory: { status: AdmissionStatus; date: string }[];
  interviewDate: string | null;
  interviewVenue: string | null;
}

export interface AdmissionsListResponse {
  items: AdmissionApplication[];
  total: number;
  page: number;
  limit: number;
}

export interface AdmissionsByGrade {
  grade: number;
  label: string;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
}

export interface AdmissionsReportSummary {
  totalApplications: number;
  byStatus: Record<string, number>;
  byGrade: AdmissionsByGrade[];
  acceptanceRate: number;
  conversionFunnel: {
    applied: number;
    reviewed: number;
    interviewed: number;
    offered: number;
    accepted: number;
  };
}

export interface BulkActionResult {
  updated: number;
  failed: number;
  emailsSent: number;
}
