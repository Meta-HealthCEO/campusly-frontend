import {
  LayoutDashboard, Users, GraduationCap, DollarSign, Wallet,
  ShoppingBag, BookOpen, CalendarDays, Bus, MessageSquare,
  BarChart3, Settings, ClipboardList, Award, Clock,
  FileText, Bell, UserCheck, BookMarked, Shield,
  Home, CreditCard, Receipt, Megaphone, Ticket,
  Building2, HeadphonesIcon, PlusCircle, PackageSearch,
  Heart, Upload, Shirt, Trophy, Sparkles,
  type LucideIcon
} from 'lucide-react';

export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_STUDENTS_NEW: '/admin/students/new',
  ADMIN_STAFF: '/admin/staff',
  ADMIN_FEES: '/admin/fees',
  ADMIN_INVOICES: '/admin/fees/invoices',
  ADMIN_DEBTORS: '/admin/fees/debtors',
  ADMIN_STATEMENTS: '/admin/fees/statements',
  ADMIN_WALLET: '/admin/wallet',
  ADMIN_TUCKSHOP: '/admin/tuckshop',
  ADMIN_ACADEMICS: '/admin/academics',
  ADMIN_ATTENDANCE: '/admin/attendance',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_TRANSPORT: '/admin/transport',
  ADMIN_COMMUNICATION: '/admin/communication',
  ADMIN_LOST_FOUND: '/admin/lost-found',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_AFTERCARE: '/admin/aftercare',
  ADMIN_ANNOUNCEMENTS: '/admin/announcements',
  ADMIN_FUNDRAISING: '/admin/fundraising',
  ADMIN_LEARNING: '/admin/learning',
  ADMIN_MIGRATION: '/admin/migration',
  ADMIN_UNIFORM: '/admin/uniform',
  ADMIN_SPORT: '/admin/sport',
  ADMIN_ACHIEVER: '/admin/achiever',
  ADMIN_ACHIEVER_HOUSES: '/admin/achiever/houses',
  ADMIN_ACHIEVER_AWARDS: '/admin/achiever/awards',
  ADMIN_CONSENT: '/admin/consent',
  ADMIN_LIBRARY: '/admin/library',

  // Parent
  PARENT_DASHBOARD: '/parent',
  PARENT_WALLET: '/parent/wallet',
  PARENT_FEES: '/parent/fees',
  PARENT_ACADEMICS: '/parent/academics',
  PARENT_ATTENDANCE: '/parent/attendance',
  PARENT_COMMUNICATION: '/parent/communication',
  PARENT_EVENTS: '/parent/events',
  PARENT_CONSENT: '/parent/consent',
  PARENT_TUCKSHOP: '/parent/tuckshop',
  PARENT_TRANSPORT: '/parent/transport',
  PARENT_LOST_FOUND: '/parent/lost-found',
  PARENT_LIBRARY: '/parent/library',

  // Student
  STUDENT_DASHBOARD: '/student',
  STUDENT_HOMEWORK: '/student/homework',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_GRADES: '/student/grades',
  STUDENT_LIBRARY: '/student/library',
  STUDENT_ACHIEVEMENTS: '/student/achievements',
  STUDENT_WALLET: '/student/wallet',

  // Teacher
  TEACHER_DASHBOARD: '/teacher',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_GRADES: '/teacher/grades',
  TEACHER_HOMEWORK: '/teacher/homework',
  TEACHER_DISCIPLINE: '/teacher/discipline',
  TEACHER_CLASSES: '/teacher/classes',
  TEACHER_TIMETABLE: '/teacher/timetable',
  TEACHER_COMMUNICATION: '/teacher/communication',
  TEACHER_REPORTS: '/teacher/reports',
  TEACHER_AI_TOOLS: '/teacher/ai-tools',
  TEACHER_AI_CREATE_PAPER: '/teacher/ai-tools/create-paper',
  TEACHER_AI_GRADING: '/teacher/ai-tools/grading',
  TEACHER_AI_PAPERS: '/teacher/ai-tools/papers',

  // Tuckshop
  TUCKSHOP_POS: '/tuckshop',

  // Super Admin
  SUPERADMIN_DASHBOARD: '/superadmin',
  SUPERADMIN_SCHOOLS: '/superadmin/schools',
  SUPERADMIN_ONBOARD: '/superadmin/onboard',
  SUPERADMIN_BILLING: '/superadmin/billing',
  SUPERADMIN_SUPPORT: '/superadmin/support',
} as const;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;
  badge?: string;
  children?: NavItem[];
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Students', href: ROUTES.ADMIN_STUDENTS, icon: GraduationCap },
  { label: 'Staff', href: ROUTES.ADMIN_STAFF, icon: Users },
  {
    label: 'Fees', href: ROUTES.ADMIN_FEES, icon: DollarSign, module: 'fees',
    children: [
      { label: 'Overview', href: ROUTES.ADMIN_FEES, icon: DollarSign },
      { label: 'Invoices', href: ROUTES.ADMIN_INVOICES, icon: Receipt },
      { label: 'Debtors', href: ROUTES.ADMIN_DEBTORS, icon: FileText },
      { label: 'Statements', href: ROUTES.ADMIN_STATEMENTS, icon: FileText },
    ],
  },
  { label: 'Wallet', href: ROUTES.ADMIN_WALLET, icon: Wallet, module: 'wallet' },
  { label: 'Tuck Shop', href: ROUTES.ADMIN_TUCKSHOP, icon: ShoppingBag, module: 'tuckshop' },
  { label: 'Academics', href: ROUTES.ADMIN_ACADEMICS, icon: BookOpen },
  { label: 'Attendance', href: ROUTES.ADMIN_ATTENDANCE, icon: ClipboardList },
  { label: 'Events', href: ROUTES.ADMIN_EVENTS, icon: CalendarDays, module: 'events' },
  { label: 'Transport', href: ROUTES.ADMIN_TRANSPORT, icon: Bus, module: 'transport' },
  { label: 'Communication', href: ROUTES.ADMIN_COMMUNICATION, icon: MessageSquare, module: 'communication' },
  { label: 'Lost & Found', href: ROUTES.ADMIN_LOST_FOUND, icon: PackageSearch },
  { label: 'Library', href: ROUTES.ADMIN_LIBRARY, icon: BookMarked, module: 'library' },
  { label: 'After Care', href: ROUTES.ADMIN_AFTERCARE, icon: Clock },
  { label: 'Announcements', href: ROUTES.ADMIN_ANNOUNCEMENTS, icon: Megaphone },
  { label: 'Fundraising', href: ROUTES.ADMIN_FUNDRAISING, icon: Heart },
  { label: 'Learning', href: ROUTES.ADMIN_LEARNING, icon: BookMarked },
  { label: 'Data Migration', href: ROUTES.ADMIN_MIGRATION, icon: Upload },
  { label: 'Uniform Shop', href: ROUTES.ADMIN_UNIFORM, icon: Shirt },
  { label: 'Sport', href: ROUTES.ADMIN_SPORT, icon: Trophy },
  {
    label: 'Achiever', href: ROUTES.ADMIN_ACHIEVER, icon: Award,
    children: [
      { label: 'Overview', href: ROUTES.ADMIN_ACHIEVER, icon: Award },
      { label: 'Houses', href: ROUTES.ADMIN_ACHIEVER_HOUSES, icon: Trophy },
      { label: 'Awards', href: ROUTES.ADMIN_ACHIEVER_AWARDS, icon: Award },
    ],
  },
  { label: 'Consent', href: ROUTES.ADMIN_CONSENT, icon: Shield, module: 'consent' },
  { label: 'Reports', href: ROUTES.ADMIN_REPORTS, icon: BarChart3 },
  { label: 'Settings', href: ROUTES.ADMIN_SETTINGS, icon: Settings },
];

export const PARENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.PARENT_DASHBOARD, icon: Home },
  { label: 'Wallet', href: ROUTES.PARENT_WALLET, icon: Wallet, module: 'wallet' },
  { label: 'Fees', href: ROUTES.PARENT_FEES, icon: CreditCard, module: 'fees' },
  { label: 'Academics', href: ROUTES.PARENT_ACADEMICS, icon: BookOpen },
  { label: 'Attendance', href: ROUTES.PARENT_ATTENDANCE, icon: UserCheck },
  { label: 'Communication', href: ROUTES.PARENT_COMMUNICATION, icon: MessageSquare, module: 'communication' },
  { label: 'Events', href: ROUTES.PARENT_EVENTS, icon: Ticket, module: 'events' },
  { label: 'Consent', href: ROUTES.PARENT_CONSENT, icon: Shield },
  { label: 'Tuck Shop', href: ROUTES.PARENT_TUCKSHOP, icon: ShoppingBag, module: 'tuckshop' },
  { label: 'Transport', href: ROUTES.PARENT_TRANSPORT, icon: Bus, module: 'transport' },
  { label: 'Lost & Found', href: ROUTES.PARENT_LOST_FOUND, icon: PackageSearch },
  { label: 'Library', href: ROUTES.PARENT_LIBRARY, icon: BookMarked, module: 'library' },
];

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.STUDENT_DASHBOARD, icon: Home },
  { label: 'Homework', href: ROUTES.STUDENT_HOMEWORK, icon: ClipboardList },
  { label: 'Timetable', href: ROUTES.STUDENT_TIMETABLE, icon: Clock },
  { label: 'Grades', href: ROUTES.STUDENT_GRADES, icon: BarChart3 },
  { label: 'Library', href: ROUTES.STUDENT_LIBRARY, icon: BookMarked, module: 'library' },
  { label: 'Achievements', href: ROUTES.STUDENT_ACHIEVEMENTS, icon: Award },
  { label: 'Wallet', href: ROUTES.STUDENT_WALLET, icon: Wallet, module: 'wallet' },
];

export const SUPERADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.SUPERADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Schools', href: ROUTES.SUPERADMIN_SCHOOLS, icon: Building2 },
  { label: 'Onboard School', href: ROUTES.SUPERADMIN_ONBOARD, icon: PlusCircle },
  { label: 'Billing', href: ROUTES.SUPERADMIN_BILLING, icon: DollarSign },
  { label: 'Support', href: ROUTES.SUPERADMIN_SUPPORT, icon: HeadphonesIcon },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.TEACHER_DASHBOARD, icon: Home },
  { label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList },
  { label: 'Grades', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: BookOpen },
  {
    label: 'AI Tools', href: ROUTES.TEACHER_AI_TOOLS, icon: Sparkles, badge: 'AI',
    children: [
      { label: 'Overview', href: ROUTES.TEACHER_AI_TOOLS, icon: Sparkles },
      { label: 'Create Paper', href: ROUTES.TEACHER_AI_CREATE_PAPER, icon: FileText },
      { label: 'AI Grading', href: ROUTES.TEACHER_AI_GRADING, icon: Award },
      { label: 'Paper Library', href: ROUTES.TEACHER_AI_PAPERS, icon: BookMarked },
    ],
  },
  { label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield },
  { label: 'Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { label: 'Timetable', href: ROUTES.TEACHER_TIMETABLE, icon: Clock },
  { label: 'Communication', href: ROUTES.TEACHER_COMMUNICATION, icon: Megaphone, module: 'communication' },
  { label: 'Reports', href: ROUTES.TEACHER_REPORTS, icon: BarChart3 },
];

export const MODULES = [
  { id: 'fees', name: 'Fee Management', description: 'Invoice, collect, and track school fees' },
  { id: 'wallet', name: 'Digital Wallet', description: 'Cashless payments via wristband or card' },
  { id: 'tuckshop', name: 'Tuck Shop POS', description: 'Point-of-sale for school tuck shop' },
  { id: 'transport', name: 'Transport', description: 'Bus routes and tracking' },
  { id: 'communication', name: 'Communication', description: 'Messaging and announcements' },
  { id: 'events', name: 'Events', description: 'Event management and ticketing' },
  { id: 'library', name: 'Library', description: 'Book lending and reading challenges' },
  { id: 'discipline', name: 'Discipline', description: 'Merit/demerit tracking' },
] as const;

export const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
] as const;

export const GRADE_LEVELS = [
  'Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
] as const;
