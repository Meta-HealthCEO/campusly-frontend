// ============================================================
// Lost & Found Types
// ============================================================

export type LostFoundCategory = 'clothing' | 'stationery' | 'lunch_box' | 'electronics' | 'sports' | 'bags' | 'other';
export type FoundItemStatus = 'unclaimed' | 'claimed' | 'matched' | 'archived';
export type LostReportStatus = 'open' | 'matched' | 'resolved' | 'closed';

export interface FoundItem {
  id: string;
  name: string;
  description: string;
  category: LostFoundCategory;
  location: string;
  photoUrl?: string;
  dateFound: string;
  status: FoundItemStatus;
  reportedBy: string;
  claimedBy?: string;
  claimedDate?: string;
  matchedReportId?: string;
}

export interface LostReport {
  id: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  itemName: string;
  description: string;
  category: LostFoundCategory;
  locationLost: string;
  dateLost: string;
  status: LostReportStatus;
  matchedItemId?: string;
  createdAt: string;
}
