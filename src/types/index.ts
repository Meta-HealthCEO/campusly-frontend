// ============================================================
// Campusly TypeScript Interfaces
// ============================================================

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'tuckshop' | 'super_admin';

// Super Admin / Platform types
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  studentCount: number;
  mrr: number; // cents
  adminEmail: string;
  adminName: string;
  city: string;
  province: string;
  enabledModules: string[];
  createdAt: string;
  trialEndsAt?: string;
  logo?: string;
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number; // cents
  status: 'paid' | 'sent' | 'overdue' | 'draft';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  tier: SubscriptionTier;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'tenant' | 'support';
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  assignedTo?: string;
}

export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  mrr: number; // cents
  arr: number; // cents
  activeTrials: number;
  outstanding: number; // cents
}

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

export interface Student {
  id: string;
  userId: string;
  user: User;
  firstName?: string;
  lastName?: string;
  admissionNumber: string;
  gradeId: string;
  grade: Grade;
  classId: string;
  class: SchoolClass;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  medicalInfo: MedicalInfo;
  parentIds: string[];
  parents: Parent[];
  walletId?: string;
  wallet?: Wallet;
  isActive: boolean;
  enrolledDate: string;
  houseId?: string;
  house?: House;
}

export interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContact: string;
  emergencyPhone: string;
  doctorName?: string;
  doctorPhone?: string;
}

export interface Parent {
  id: string;
  userId: string;
  user: User;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  occupation?: string;
  employer?: string;
  studentIds: string[];
  students: Student[];
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

export interface Grade {
  id: string;
  name: string;
  level: number;
  schoolId: string;
  classes: SchoolClass[];
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
  grade: Grade;
  gradeName?: string;
  teacherId: string;
  teacher: Teacher;
  capacity: number;
  studentCount: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  gradeId: string;
  teacherId: string;
  teacher: Teacher;
  isElective: boolean;
}

export interface TimetableSlot {
  id: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subject: Subject;
  classId: string;
  teacherId: string;
  room?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  student: Student;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: number;
  note?: string;
  markedById: string;
  markedBy: User;
}

export interface Assessment {
  id: string;
  name: string;
  type: 'test' | 'exam' | 'assignment' | 'project' | 'quiz';
  subjectId: string;
  subject: Subject;
  classId: string;
  totalMarks: number;
  weight: number;
  date: string;
  term: number;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  student: Student;
  assessmentId: string;
  assessment: Assessment;
  marks: number;
  percentage: number;
  comment?: string;
  gradedById: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subject?: Subject;
  subjectName?: string;
  classId: string;
  teacherId: string;
  teacher?: Teacher;
  dueDate: string;
  attachments: string[];
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  homework: Homework;
  studentId: string;
  student: Student;
  content?: string;
  attachments: string[];
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
}

// Financial types
export interface FeeType {
  id: string;
  name: string;
  description: string;
  amount: number; // in cents
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually';
  gradeIds: string[];
  isOptional: boolean;
  schoolId: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  student: Student;
  parentId: string;
  parent: Parent;
  items: InvoiceItem[];
  totalAmount: number; // cents
  paidAmount: number; // cents
  balanceDue: number; // cents
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  dueDate: string;
  issuedDate: string;
  term: number;
  year: number;
}

export interface InvoiceItem {
  id: string;
  feeTypeId: string;
  feeType: FeeType;
  description: string;
  amount: number; // cents
  quantity: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  parentId: string;
  amount: number; // cents
  method: 'cash' | 'eft' | 'card' | 'debit_order' | 'wallet';
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
}

export interface PaymentArrangement {
  id: string;
  parentId: string;
  invoiceId: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  startDate: string;
  status: 'active' | 'completed' | 'defaulted';
}

// Wallet & Tuckshop
export interface Wallet {
  id: string;
  studentId: string;
  balance: number; // cents
  wristbandId?: string;
  dailyLimit: number; // cents
  isActive: boolean;
  lastTopUp?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'topup' | 'purchase' | 'refund';
  amount: number; // cents
  balance: number; // cents
  description: string;
  reference?: string;
  createdAt: string;
}

export interface TuckshopItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number; // cents
  image?: string;
  allergens: string[];
  isAvailable: boolean;
  stockCount?: number;
}

export interface TuckshopOrder {
  id: string;
  studentId: string;
  student: Student;
  items: TuckshopOrderItem[];
  totalAmount: number; // cents
  walletTransactionId: string;
  servedBy: string;
  createdAt: string;
}

export interface TuckshopOrderItem {
  id: string;
  itemId: string;
  item: TuckshopItem;
  quantity: number;
  price: number; // cents
}

// Communication
export interface Message {
  id: string;
  senderId: string;
  sender: User;
  recipientIds: string[];
  subject: string;
  body: string;
  type: 'message' | 'announcement' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  attachments: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// Events
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

// Transport
export interface TransportRoute {
  id: string;
  name: string;
  description: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleReg: string;
  stops: TransportStop[];
  studentIds: string[];
  isActive: boolean;
}

export interface TransportStop {
  id: string;
  name: string;
  address: string;
  time: string;
  order: number;
}

// Library
export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  location: string;
}

export interface BookBorrowing {
  id: string;
  bookId: string;
  book: LibraryBook;
  studentId: string;
  student: Student;
  borrowedDate: string;
  dueDate: string;
  returnedDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
}

// Discipline
export interface DisciplineRecord {
  id: string;
  studentId: string;
  student: Student;
  type: 'merit' | 'demerit';
  category: string;
  points: number;
  description: string;
  reportedById: string;
  reportedBy: User;
  date: string;
}

// Consent Forms
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

// House system
export interface House {
  id: string;
  name: string;
  color: string;
  points: number;
  motto?: string;
}

// Achievement / Badge
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'academic' | 'sports' | 'leadership' | 'service' | 'special';
  points: number;
}

export interface StudentAchievement {
  id: string;
  studentId: string;
  achievementId: string;
  achievement: Achievement;
  awardedDate: string;
  awardedBy: string;
}

// Lost & Found
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

// Report types
export interface DebtorEntry {
  parentId: string;
  parentName: string;
  studentName: string;
  grade: string;
  totalOwed: number; // cents
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  lastPaymentDate?: string;
}

export interface DailySalesSummary {
  date: string;
  totalTransactions: number;
  totalRevenue: number; // cents
  topItems: { name: string; quantity: number; revenue: number }[];
  averageTransaction: number;
}

// API response types
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

// Auth
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
