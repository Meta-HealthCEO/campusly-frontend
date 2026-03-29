import {
  LayoutDashboard, Users, GraduationCap, DollarSign, Wallet,
  ShoppingBag, BookOpen, CalendarDays, Bus, MessageSquare,
  BarChart3, Settings, ClipboardList, Award, Clock,
  FileText, Bell, UserCheck, BookMarked, Shield,
  Home, CreditCard, Receipt, Megaphone, Ticket,
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
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',

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
  TEACHER_COMMUNICATION: '/teacher/communication',
  TEACHER_REPORTS: '/teacher/reports',

  // Tuckshop
  TUCKSHOP_POS: '/tuckshop',
} as const;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;
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

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.TEACHER_DASHBOARD, icon: Home },
  { label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList },
  { label: 'Grades', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: BookOpen },
  { label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield },
  { label: 'Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
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
