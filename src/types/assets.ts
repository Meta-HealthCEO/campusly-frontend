// ─── Enums ────────────────────────────────────────────────────────────────────

export type AssetStatus = 'procured' | 'in_service' | 'under_repair' | 'disposed' | 'lost' | 'stolen';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';
export type LocationType = 'building' | 'room' | 'hall' | 'field' | 'storage' | 'office' | 'other';
export type AssignmentType = 'user' | 'department' | 'location' | 'class';
export type CheckOutStatus = 'checked_out' | 'returned' | 'overdue';
export type MaintenanceType = 'repair' | 'service' | 'upgrade' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type IncidentType = 'damage' | 'loss' | 'theft' | 'vandalism';
export type IncidentStatus = 'reported' | 'investigating' | 'resolved';
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annual';

// ─── Asset Category ───────────────────────────────────────────────────────────

export interface AssetCategory {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  parentId: string | null;
  description?: string;
  depreciationRate?: number;
  usefulLifeYears?: number;
  isActive: boolean;
  children?: AssetCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetCategoryPayload {
  name: string;
  code: string;
  parentId?: string | null;
  description?: string;
  depreciationRate?: number;
  usefulLifeYears?: number;
}

// ─── Asset Location ───────────────────────────────────────────────────────────

export interface AssetLocation {
  id: string;
  schoolId: string;
  name: string;
  type: LocationType;
  building?: string;
  floor?: string;
  department?: string;
  description?: string;
  createdAt: string;
}

export interface CreateLocationPayload {
  name: string;
  type: LocationType;
  building?: string;
  floor?: string;
  department?: string;
  description?: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export interface AssignmentHistoryEntry {
  assignedTo: string;
  assignedToType: AssignmentType;
  assignedBy: string;
  assignedAt: string;
  unassignedAt?: string;
  notes?: string;
}

export interface Asset {
  id: string;
  schoolId: string;
  categoryId: string | { id: string; name: string; code: string };
  name: string;
  assetTag: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  vendor?: string;
  invoiceReference?: string;
  locationId?: string | { id: string; name: string };
  status: AssetStatus;
  condition?: AssetCondition;
  isPortable: boolean;
  assignedTo?: string | { id: string; firstName: string; lastName: string };
  assignedToType?: AssignmentType;
  assignmentHistory?: AssignmentHistoryEntry[];
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPayload {
  categoryId: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  vendor?: string;
  invoiceReference?: string;
  locationId?: string;
  status: AssetStatus;
  condition?: AssetCondition;
  isPortable?: boolean;
  imageUrl?: string;
  notes?: string;
}

export interface AssetFilters {
  categoryId?: string;
  locationId?: string;
  status?: string;
  condition?: string;
  isPortable?: boolean;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssignPayload {
  assignedTo: string;
  assignedToType: AssignmentType;
  notes?: string;
}

// ─── Check-Out ────────────────────────────────────────────────────────────────

export interface AssetCheckOut {
  id: string;
  assetId: string | { id: string; name: string; assetTag: string };
  schoolId: string;
  borrowerId: string | { id: string; firstName: string; lastName: string };
  checkedOutBy: string | { id: string; firstName: string; lastName: string };
  checkedOutAt: string;
  expectedReturnDate: string;
  checkedInAt?: string;
  checkedInBy?: string;
  conditionOut?: string;
  conditionIn?: string;
  purpose: string;
  status: CheckOutStatus;
  notes?: string;
  createdAt: string;
}

export interface CheckOutPayload {
  borrowerId: string;
  purpose: string;
  expectedReturnDate: string;
  notes?: string;
}

export interface CheckInPayload {
  conditionIn?: AssetCondition;
  notes?: string;
}

export interface CheckOutFilters {
  status?: string;
  assetId?: string;
  borrowerId?: string;
  page?: number;
  limit?: number;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export interface AssetMaintenance {
  id: string;
  assetId: string | { id: string; name: string; assetTag: string };
  schoolId: string;
  type: MaintenanceType;
  description: string;
  vendor?: string;
  cost?: number;
  scheduledDate?: string;
  completedDate?: string;
  status: MaintenanceStatus;
  createdBy: string;
  notes?: string;
  createdAt: string;
}

export interface CreateMaintenancePayload {
  type: MaintenanceType;
  description: string;
  vendor?: string;
  cost?: number;
  scheduledDate?: string;
  completedDate?: string;
  status: MaintenanceStatus;
  notes?: string;
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export interface AssetIncident {
  id: string;
  assetId: string | { id: string; name: string; assetTag: string };
  schoolId: string;
  type: IncidentType;
  description: string;
  date: string;
  reportedBy: string | { id: string; firstName: string; lastName: string };
  responsiblePartyId?: string;
  estimatedCost?: number;
  actualCost?: number;
  images?: string[];
  status: IncidentStatus;
  resolution?: string;
  createdAt: string;
}

export interface CreateIncidentPayload {
  type: IncidentType;
  description: string;
  date: string;
  responsiblePartyId?: string;
  estimatedCost?: number;
  images?: string[];
}

// ─── Insurance ────────────────────────────────────────────────────────────────

export interface AssetInsurance {
  id: string;
  schoolId: string;
  policyNumber: string;
  insurer: string;
  categoryId?: string | { id: string; name: string };
  coverageAmount: number;
  premium: number;
  premiumFrequency: PremiumFrequency;
  startDate: string;
  expiryDate: string;
  excess?: number;
  notes?: string;
  createdAt: string;
}

export interface CreateInsurancePayload {
  policyNumber: string;
  insurer: string;
  categoryId?: string;
  coverageAmount: number;
  premium: number;
  premiumFrequency: PremiumFrequency;
  startDate: string;
  expiryDate: string;
  excess?: number;
  notes?: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface AssetSummaryReport {
  totalAssets: number;
  totalValue: number;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number; value: number }[];
  recentAcquisitions: number;
  maintenanceDue: number;
  overdueCheckouts: number;
  insuranceExpiringSoon: number;
}

export interface DepreciationAsset {
  assetId: string;
  name: string;
  assetTag: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  annualDepreciation: number;
  usefulLifeRemaining: number;
}

export interface DepreciationCategory {
  categoryName: string;
  categoryCode: string;
  assetCount: number;
  purchaseValue: number;
  currentValue: number;
  depreciation: number;
  depreciationRate: number;
}

export interface DepreciationReport {
  asOfDate: string;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  byCategory: DepreciationCategory[];
  assets: DepreciationAsset[];
}

export interface MaintenanceCostEntry {
  category: string;
  totalCost: number;
  count: number;
}

export interface MaintenanceCostReport {
  year: number;
  entries: MaintenanceCostEntry[];
  totalCost: number;
}
