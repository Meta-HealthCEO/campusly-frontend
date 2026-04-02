// ============================================================
// Event Types
// ============================================================

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  type: 'academic' | 'sports' | 'cultural' | 'social' | 'meeting';
  startDate: string;
  endDate: string;
  location?: string;
  isAllDay: boolean;
  requiresConsent: boolean;
  ticketPrice?: number; // cents
  maxAttendees?: number;
  createdBy: string;
}
