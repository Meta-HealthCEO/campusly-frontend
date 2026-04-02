// ============================================================
// Consent Form Types
// ============================================================

export interface ConsentForm {
  id: string;
  title: string;
  description: string;
  eventId?: string;
  dueDate: string;
  status: 'pending' | 'signed' | 'declined';
  parentId: string;
  studentId: string;
  signedAt?: string;
}
