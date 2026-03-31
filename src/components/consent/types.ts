/** Backend-aligned consent form type used by consent components. */
export interface ApiConsentForm {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  type: 'trip' | 'medical' | 'general' | 'photo' | 'data';
  targetStudents: string[];
  requiresBothParents: boolean;
  expiryDate?: string;
  attachmentUrl?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Backend-aligned consent response type. */
export interface ApiConsentResponse {
  id: string;
  formId: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
  } | string;
  parentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | string;
  response: 'granted' | 'denied';
  signedAt: string;
  ipAddress?: string;
  signature?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Helper to normalize _id -> id from raw API data */
export function normalizeConsentForm(raw: Record<string, unknown>): ApiConsentForm {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? undefined,
    type: (raw.type as ApiConsentForm['type']) ?? 'general',
    targetStudents: Array.isArray(raw.targetStudents)
      ? (raw.targetStudents as string[])
      : [],
    requiresBothParents: (raw.requiresBothParents as boolean) ?? false,
    expiryDate: (raw.expiryDate as string) ?? undefined,
    attachmentUrl: (raw.attachmentUrl as string) ?? undefined,
    createdBy: raw.createdBy as ApiConsentForm['createdBy'],
    isDeleted: (raw.isDeleted as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

/** Helper to normalize _id -> id from raw consent response data */
export function normalizeConsentResponse(raw: Record<string, unknown>): ApiConsentResponse {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    formId: (raw.formId as string) ?? '',
    studentId: raw.studentId as ApiConsentResponse['studentId'],
    parentId: raw.parentId as ApiConsentResponse['parentId'],
    response: (raw.response as ApiConsentResponse['response']) ?? 'granted',
    signedAt: (raw.signedAt as string) ?? '',
    ipAddress: (raw.ipAddress as string) ?? undefined,
    signature: (raw.signature as string) ?? undefined,
    notes: (raw.notes as string) ?? undefined,
    isDeleted: (raw.isDeleted as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}
