/** Uniform module local types — not in src/types/index.ts */

export type UniformCategory =
  | 'shirt'
  | 'pants'
  | 'skirt'
  | 'blazer'
  | 'tie'
  | 'shoes'
  | 'sports'
  | 'other';

export type UniformOrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'ready'
  | 'collected'
  | 'cancelled';

export type SecondHandCondition = 'new' | 'like_new' | 'good' | 'fair';
export type SecondHandStatus = 'available' | 'reserved' | 'sold';
export type PreOrderStatus = 'pre_order' | 'available' | 'ready' | 'collected';

export interface UniformItem {
  id: string;
  name: string;
  schoolId: string;
  description?: string;
  category: UniformCategory;
  sizes: string[];
  price: number;
  stock: number;
  image?: string;
  isAvailable: boolean;
  lowStockThreshold: number;
  sizeGuideUrl?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UniformOrderItem {
  uniformItemId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PopulatedStudent {
  _id: string;
  firstName: string;
  lastName: string;
  grade?: string;
}

export interface UniformOrder {
  id: string;
  studentId: string | PopulatedStudent;
  schoolId: string;
  items: UniformOrderItem[];
  totalAmount: number;
  status: UniformOrderStatus;
  orderedBy: string | PopulatedUser;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecondHandListing {
  id: string;
  schoolId: string;
  parentId: string | PopulatedUser;
  itemName: string;
  size: string;
  condition: SecondHandCondition;
  price: number;
  photos: string[];
  description?: string;
  status: SecondHandStatus;
  buyerId?: string | PopulatedUser;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SizeGuideMeasurement {
  size: string;
  chest: string;
  waist: string;
  length: string;
}

export interface SizeGuide {
  id: string;
  uniformItemId: string;
  schoolId: string;
  sizeChartImageUrl: string;
  measurements: SizeGuideMeasurement[];
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreOrder {
  id: string;
  uniformItemId: string | UniformItem;
  studentId: string | PopulatedStudent;
  schoolId: string;
  size: string;
  quantity: number;
  status: PreOrderStatus;
  availableDate: string;
  orderedBy: string | PopulatedUser;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
