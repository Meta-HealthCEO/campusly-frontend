// ============================================================
// Common / Shared Types
// ============================================================

import type { Wallet } from './wallet';
import type { House } from './achiever';
import type { Grade, SchoolClass } from './academic';

export type UserRole =
  | 'admin'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'tuckshop'
  | 'super_admin'
  | 'sgb_member'
  | 'coach'
  | 'sports_manager';

/**
 * A reference field that might be either a raw ObjectId string or a populated
 * object containing `id` / `_id`. Matches the shape `resolveId` accepts.
 */
export type PopulatedId = string | { id?: string; _id?: string } | null | undefined;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  schoolId: string;
  isActive: boolean;
  isSchoolPrincipal?: boolean;
  isHOD?: boolean;
  isBursar?: boolean;
  isCounselor?: boolean;
  isReceptionist?: boolean;
  isStandaloneTeacher?: boolean;
  isStandaloneCoach?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  type: 'primary' | 'secondary' | 'combined';
  enabledModules: string[];
  settings: SchoolSettings;
  createdAt: string;
}

export interface SchoolSettings {
  currency: string;
  timezone: string;
  academicYearStart: string;
  academicYearEnd: string;
  attendanceMethod: 'period' | 'daily';
  gradingSystem: 'percentage' | 'letter' | 'gpa';
}

export type EnrollmentStatus = 'active' | 'transferred' | 'graduated' | 'expelled' | 'withdrawn';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalAidInfo {
  provider: string;
  memberNumber: string;
  mainMember: string;
}

export interface MedicalProfile {
  allergies: string[];
  conditions: string[];
  bloodType?: string;
  emergencyContacts: EmergencyContact[];
  medicalAidInfo?: MedicalAidInfo;
}

export interface Student {
  id: string;
  _id?: string;
  userId: string;
  user: User;
  firstName?: string;
  lastName?: string;
  admissionNumber: string;
  schoolId: string;
  gradeId: string;
  grade: Grade;
  classId: string;
  class: SchoolClass;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  guardianIds: string[];
  parents?: Parent[];
  enrollmentDate?: string;
  enrollmentStatus: EnrollmentStatus;
  medicalProfile: MedicalProfile;
  previousSchool?: string;
  homeLanguage?: string;
  additionalLanguages?: string[];
  transportRequired?: boolean;
  afterCareRequired?: boolean;
  saIdNumber?: string;
  luritsNumber?: string;
  photoUrl?: string;
  walletId?: string;
  wallet?: Wallet;
  houseId?: string;
  house?: House;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CommunicationPreference = 'email' | 'sms' | 'whatsapp' | 'push';

export interface Parent {
  id: string;
  _id?: string;
  userId: string;
  user: User;
  schoolId?: string;
  childrenIds: string[] | Student[];
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  occupation?: string;
  employer?: string;
  workPhone?: string;
  alternativeEmail?: string;
  communicationPreference?: CommunicationPreference;
  isMainCaregiver?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  user: User;
  employeeNumber: string;
  department?: string;
  subjects: string[];
  qualifications: string[];
  hireDate: string;
  classIds: string[];
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  revenueCollected: number;
  collectionRate: number;
  attendanceRate: number;
  outstandingFees: number;
  walletBalance: number;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterSchoolData {
  schoolName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  schoolType: 'primary' | 'secondary' | 'combined';
}

// ─── School (Backend-aligned) ───────────────────────────────────────────────

export interface SchoolAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface SchoolContactInfo {
  email: string;
  phone: string;
  website?: string;
}

export interface SchoolSubscription {
  tier: 'basic' | 'standard' | 'premium';
  expiresAt: string;
}

export interface SchoolAcademicSettings {
  academicYear: number;
  terms: number;
  gradingSystem: 'percentage' | 'letter' | 'gpa';
}

export type SchoolType = 'primary' | 'secondary' | 'combined' | 'special';

export interface SchoolDocument {
  id: string;
  name: string;
  address: SchoolAddress;
  logo?: string;
  contactInfo: SchoolContactInfo;
  subscription: SchoolSubscription;
  modulesEnabled: string[];
  settings: SchoolAcademicSettings;
  principal?: string;
  emisNumber?: string;
  type?: SchoolType;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolInput {
  name: string;
  address: SchoolAddress;
  contactInfo: SchoolContactInfo;
  subscription: SchoolSubscription;
  settings: SchoolAcademicSettings;
  logo?: string;
  modulesEnabled?: string[];
  principal?: string;
  emisNumber?: string;
  type?: SchoolType;
}

export interface UpdateSchoolInput {
  name?: string;
  address?: Partial<SchoolAddress>;
  contactInfo?: Partial<SchoolContactInfo>;
  subscription?: Partial<SchoolSubscription>;
  settings?: Partial<SchoolAcademicSettings>;
  logo?: string;
  modulesEnabled?: string[];
  principal?: string;
  emisNumber?: string;
  type?: SchoolType;
  isActive?: boolean;
}

export interface UpdateSettingsInput {
  academicYear?: number;
  terms?: number;
  gradingSystem?: 'percentage' | 'letter' | 'gpa';
}
