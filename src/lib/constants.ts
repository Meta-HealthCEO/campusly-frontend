import {
  LayoutDashboard, Users, GraduationCap, DollarSign, Wallet,
  ShoppingBag, BookOpen, CalendarDays, Bus, MessageSquare,
  BarChart3, Settings, ClipboardList, Award, Clock,
  FileText, Bell, UserCheck, BookMarked, Shield,
  Home, CreditCard, Receipt, Megaphone, Ticket,
  Building2, HeadphonesIcon, PlusCircle, PackageSearch,
  Heart, Upload, Shirt, Trophy, Sparkles,
  Compass, Target, Clipboard, Newspaper,
  CalendarCheck, CalendarCog, Crown, DoorOpen, UserPlus,
  AlertTriangle, Calculator,
  CheckSquare, Video, PlayCircle, ScrollText,
  User,
  type LucideIcon
} from 'lucide-react';
import type { PermissionFlag } from '@/types';
import { ROUTES } from './routes';

export * from './routes';


export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;
  badge?: string;
  permission?: PermissionFlag;
  children?: NavItem[];
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Students', href: ROUTES.ADMIN_STUDENTS, icon: GraduationCap },
  { label: 'Staff', href: ROUTES.ADMIN_STAFF, icon: Users },
  {
    label: 'Courses',
    href: ROUTES.ADMIN_COURSES,
    icon: GraduationCap,
    module: 'courses',
    children: [
      { label: 'All Courses', href: ROUTES.ADMIN_COURSES, icon: GraduationCap },
      { label: 'Review Queue', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare },
    ],
  },
  {
    label: 'Fees', href: ROUTES.ADMIN_FEES, icon: DollarSign, module: 'fee',
    children: [
      { label: 'Overview', href: ROUTES.ADMIN_FEES, icon: DollarSign },
      { label: 'Invoices', href: ROUTES.ADMIN_INVOICES, icon: Receipt },
      { label: 'Debtors', href: ROUTES.ADMIN_DEBTORS, icon: FileText },
      { label: 'Statements', href: ROUTES.ADMIN_STATEMENTS, icon: FileText },
      { label: 'Online Payments', href: ROUTES.ADMIN_ONLINE_PAYMENTS, icon: CreditCard },
      { label: 'Accounting', href: ROUTES.ADMIN_ACCOUNTING, icon: BarChart3 },
    ],
  },
  { label: 'Wallet', href: ROUTES.ADMIN_WALLET, icon: Wallet, module: 'wallet' },
  { label: 'Tuck Shop', href: ROUTES.ADMIN_TUCKSHOP, icon: ShoppingBag, module: 'tuckshop' },
  { label: 'Academics', href: ROUTES.ADMIN_ACADEMICS, icon: BookOpen },
  { label: 'Timetable Builder', href: ROUTES.ADMIN_TIMETABLE_BUILDER, icon: CalendarCog },
  { label: 'Attendance', href: ROUTES.ADMIN_ATTENDANCE, icon: ClipboardList },
  { label: 'Substitutes', href: ROUTES.ADMIN_SUBSTITUTES, icon: UserCheck },
  { label: 'Events', href: ROUTES.ADMIN_EVENTS, icon: CalendarDays, module: 'event' },
  { label: 'Transport', href: ROUTES.ADMIN_TRANSPORT, icon: Bus, module: 'transport' },
  {
    label: 'Communication', href: ROUTES.ADMIN_COMMUNICATION, icon: MessageSquare, module: 'communication',
    children: [
      { label: 'Messages', href: ROUTES.ADMIN_COMMUNICATION, icon: MessageSquare },
      { label: 'Delivery Dashboard', href: ROUTES.ADMIN_COMM_DASHBOARD, icon: BarChart3 },
      { label: 'Delivery Log', href: ROUTES.ADMIN_COMM_LOG, icon: FileText },
    ],
  },
  { label: 'Lost & Found', href: ROUTES.ADMIN_LOST_FOUND, icon: PackageSearch },
  { label: 'Library', href: ROUTES.ADMIN_LIBRARY, icon: BookMarked, module: 'library' },
  { label: 'After Care', href: ROUTES.ADMIN_AFTERCARE, icon: Clock },
  { label: 'Announcements', href: ROUTES.ADMIN_ANNOUNCEMENTS, icon: Megaphone },
  { label: 'School News', href: ROUTES.ADMIN_SCHOOL_NEWS, icon: Newspaper },
  { label: 'Fundraising', href: ROUTES.ADMIN_FUNDRAISING, icon: Heart },
  { label: 'Learning', href: ROUTES.ADMIN_LEARNING, icon: BookMarked },
  { label: 'Data Migration', href: ROUTES.ADMIN_MIGRATION, icon: Upload },
  { label: 'Uniform Shop', href: ROUTES.ADMIN_UNIFORM, icon: Shirt },
  {
    label: 'Sport', href: ROUTES.ADMIN_SPORT, icon: Trophy, module: 'sport',
    children: [
      { label: 'Overview', href: ROUTES.ADMIN_SPORT, icon: Trophy },
      { label: 'Player Cards', href: ROUTES.ADMIN_SPORT_PLAYER_CARDS, icon: Award },
      { label: 'AI Analytics', href: ROUTES.ADMIN_SPORT_AI_ANALYTICS, icon: Sparkles },
      { label: 'Coach Assignments', href: ROUTES.ADMIN_SPORT_COACHES, icon: UserPlus },
    ],
  },
  {
    label: 'Achiever', href: ROUTES.ADMIN_ACHIEVER, icon: Award,
    children: [
      { label: 'Overview', href: ROUTES.ADMIN_ACHIEVER, icon: Award },
      { label: 'Houses', href: ROUTES.ADMIN_ACHIEVER_HOUSES, icon: Trophy },
      { label: 'Awards', href: ROUTES.ADMIN_ACHIEVER_AWARDS, icon: Award },
    ],
  },
  { label: 'Budget', href: ROUTES.ADMIN_BUDGET, icon: Calculator, module: 'budget' },
  { label: 'Incidents', href: ROUTES.ADMIN_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
  { label: 'Wellbeing', href: ROUTES.ADMIN_WELLBEING, icon: Heart, module: 'incident_wellbeing' },
  { label: 'Consent', href: ROUTES.ADMIN_CONSENT, icon: Shield, module: 'consent' },
  { label: 'Meetings', href: ROUTES.ADMIN_MEETINGS, icon: CalendarCheck },
  { label: 'Staff Leave', href: ROUTES.ADMIN_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { label: 'Conferences', href: ROUTES.ADMIN_CONFERENCES, icon: Users, module: 'conference_booking' },
  {
    label: 'Career Guidance', href: ROUTES.ADMIN_CAREERS_UNIVERSITIES, icon: Compass, module: 'careers',
    children: [
      { label: 'Universities', href: ROUTES.ADMIN_CAREERS_UNIVERSITIES, icon: GraduationCap },
      { label: 'Programmes', href: ROUTES.ADMIN_CAREERS_PROGRAMMES, icon: BookOpen },
      { label: 'Bursaries', href: ROUTES.ADMIN_CAREERS_BURSARIES, icon: DollarSign },
    ],
  },
  {
    label: 'Admissions', href: ROUTES.ADMIN_ADMISSIONS, icon: UserPlus, module: 'admissions',
    children: [
      { label: 'Pipeline', href: ROUTES.ADMIN_ADMISSIONS, icon: UserPlus },
      { label: 'Capacity', href: ROUTES.ADMIN_ADMISSIONS_CAPACITY, icon: Users },
      { label: 'Reports', href: ROUTES.ADMIN_ADMISSIONS_REPORTS, icon: BarChart3 },
    ],
  },
  { label: 'Reports', href: ROUTES.ADMIN_REPORTS, icon: BarChart3 },
  // ─── Permission-gated (Special Roles) ──────────────────────────────
  { label: 'Principal Dashboard', href: ROUTES.ADMIN_PRINCIPAL, icon: Crown, permission: 'isSchoolPrincipal' },
  { label: 'Financial Management', href: ROUTES.ADMIN_BURSAR, icon: Wallet, permission: 'isBursar' },
  { label: 'Visitor Management', href: ROUTES.ADMIN_RECEPTION, icon: DoorOpen, permission: 'isReceptionist' },
  {
    label: 'Settings', href: ROUTES.ADMIN_SETTINGS, icon: Settings,
    children: [
      { label: 'General', href: ROUTES.ADMIN_SETTINGS, icon: Settings },
      { label: 'Payments', href: ROUTES.ADMIN_PAYMENT_SETTINGS, icon: CreditCard },
      { label: 'Messaging', href: ROUTES.ADMIN_COMM_CONFIG, icon: MessageSquare },
      { label: 'Templates', href: ROUTES.ADMIN_COMM_TEMPLATES, icon: FileText },
      { label: 'WhatsApp', href: ROUTES.ADMIN_WHATSAPP_SETTINGS, icon: MessageSquare },
      { label: 'Permissions', href: ROUTES.ADMIN_PERMISSIONS, icon: Shield },
    ],
  },
];

export const PARENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.PARENT_DASHBOARD, icon: Home },
  { label: 'Wallet', href: ROUTES.PARENT_WALLET, icon: Wallet, module: 'wallet' },
  { label: 'Fees', href: ROUTES.PARENT_FEES, icon: CreditCard, module: 'fee' },
  { label: 'Academics', href: ROUTES.PARENT_ACADEMICS, icon: BookOpen },
  { label: 'Attendance', href: ROUTES.PARENT_ATTENDANCE, icon: UserCheck },
  { label: 'Homework', href: ROUTES.PARENT_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { label: 'Messages', href: ROUTES.PARENT_MESSAGES, icon: MessageSquare },
  { label: 'Notice Board', href: ROUTES.PARENT_NOTICE_BOARD, icon: Clipboard },
  { label: 'Daily Digest', href: ROUTES.PARENT_DIGEST, icon: Newspaper },
  { label: 'Communication', href: ROUTES.PARENT_COMMUNICATION, icon: Megaphone, module: 'communication' },
  { label: 'Events', href: ROUTES.PARENT_EVENTS, icon: Ticket, module: 'event' },
  { label: 'Consent', href: ROUTES.PARENT_CONSENT, icon: Shield },
  { label: 'Tuck Shop', href: ROUTES.PARENT_TUCKSHOP, icon: ShoppingBag, module: 'tuckshop' },
  { label: 'Transport', href: ROUTES.PARENT_TRANSPORT, icon: Bus, module: 'transport' },
  { label: 'Lost & Found', href: ROUTES.PARENT_LOST_FOUND, icon: PackageSearch },
  { label: 'Library', href: ROUTES.PARENT_LIBRARY, icon: BookMarked, module: 'library' },
  { label: 'Sports', href: ROUTES.PARENT_SPORTS, icon: Trophy, module: 'sport' },
  { label: 'Admissions', href: ROUTES.PARENT_ADMISSIONS, icon: UserPlus, module: 'admissions' },
  { label: 'Meetings', href: ROUTES.PARENT_MEETINGS, icon: CalendarCheck },
  { label: 'Conferences', href: ROUTES.PARENT_CONFERENCES, icon: Users, module: 'conference_booking' },
  { label: 'Settings', href: ROUTES.PARENT_SETTINGS, icon: Bell },
  { label: 'AI Assistant', href: ROUTES.PARENT_AI_ASSISTANT, icon: Sparkles, module: 'ai_tools' },
  {
    label: 'Career Guidance', href: ROUTES.PARENT_CAREERS, icon: Compass, module: 'careers',
    children: [
      { label: 'Overview', href: ROUTES.PARENT_CAREERS, icon: Compass },
      { label: 'Portfolio', href: ROUTES.PARENT_PORTFOLIO, icon: BookOpen },
    ],
  },
];

// Phase 1 — always visible (the 6 MVP items for the standalone-teacher student MVP)
// Phase 2 — module-gated, hidden until the school enables that module
export const STUDENT_NAV: NavItem[] = [
  // Phase 1 (always visible)
  { label: 'Dashboard', href: ROUTES.STUDENT_DASHBOARD, icon: Home },
  { label: 'Lessons',   href: '/student/lessons',        icon: BookOpen },
  { label: 'Homework',  href: ROUTES.STUDENT_HOMEWORK,   icon: ClipboardList, module: 'homework' },
  { label: 'Assignments', href: '/student/assignments',  icon: ScrollText, module: 'homework' },
  { label: 'Tests',     href: '/student/tests',          icon: FileText },
  { label: 'AI Tutor',  href: ROUTES.STUDENT_AI_TUTOR,   icon: Sparkles, module: 'ai_tools' },
  { label: 'Profile',   href: '/student/profile',        icon: User },

  // Phase 2 (module-gated)
  { label: 'My Classes',    href: ROUTES.STUDENT_CLASSES,       icon: Users,    module: 'academic' },
  { label: 'Timetable',     href: ROUTES.STUDENT_TIMETABLE,     icon: Clock,    module: 'academic' },
  { label: 'Grades',        href: ROUTES.STUDENT_GRADES,        icon: BarChart3, module: 'academic' },
  { label: 'Wallet',        href: ROUTES.STUDENT_WALLET,        icon: Wallet,   module: 'wallet' },
  { label: 'Library',       href: ROUTES.STUDENT_LIBRARY,       icon: BookMarked, module: 'library' },
  { label: 'Achievements',  href: ROUTES.STUDENT_ACHIEVEMENTS,  icon: Award,    module: 'achiever' },
  { label: 'My Sports',     href: ROUTES.STUDENT_SPORTS,        icon: Trophy,   module: 'sport' },
  { label: 'Wellbeing',     href: ROUTES.STUDENT_WELLBEING,     icon: Heart,    module: 'incident_wellbeing' },
  {
    label: 'Career Guidance', href: ROUTES.STUDENT_CAREERS, icon: Compass, module: 'careers',
    children: [
      { label: 'Dashboard', href: ROUTES.STUDENT_CAREERS, icon: Compass },
      { label: 'Explore Programmes', href: ROUTES.STUDENT_CAREERS_EXPLORE, icon: GraduationCap },
      { label: 'My Applications', href: ROUTES.STUDENT_CAREERS_APPLICATIONS, icon: FileText },
      { label: 'Aptitude Test', href: ROUTES.STUDENT_CAREERS_APTITUDE, icon: Target },
      { label: 'Bursaries', href: ROUTES.STUDENT_CAREERS_BURSARIES, icon: DollarSign },
      { label: 'Portfolio', href: ROUTES.STUDENT_PORTFOLIO, icon: BookOpen },
    ],
  },
  { label: 'Classroom',     href: '/student/classroom',         icon: Video,    module: 'academic' },
];

export const SUPERADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.SUPERADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Schools', href: ROUTES.SUPERADMIN_SCHOOLS, icon: Building2 },
  { label: 'Onboard School', href: ROUTES.SUPERADMIN_ONBOARD, icon: PlusCircle },
  { label: 'Billing', href: ROUTES.SUPERADMIN_BILLING, icon: DollarSign },
  { label: 'Support', href: ROUTES.SUPERADMIN_SUPPORT, icon: HeadphonesIcon },
];

export const COACH_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.COACH_DASHBOARD, icon: Home },
  { label: 'Teams', href: ROUTES.COACH_TEAMS, icon: Users },
  { label: 'Fixtures', href: ROUTES.COACH_FIXTURES, icon: CalendarDays },
  { label: 'Training', href: ROUTES.COACH_TRAINING, icon: Target },
  { label: 'Drill Library', href: ROUTES.COACH_DRILLS, icon: BookMarked },
  { label: 'Injuries', href: ROUTES.COACH_INJURIES, icon: Heart },
  { label: 'Fitness', href: ROUTES.COACH_FITNESS, icon: Target },
  { label: 'Announcements', href: ROUTES.COACH_ANNOUNCEMENTS, icon: Megaphone },
  { label: 'Seasons', href: ROUTES.COACH_SEASONS, icon: BarChart3 },
  { label: 'Results', href: ROUTES.COACH_RESULTS, icon: ClipboardList },
  { label: 'Players', href: ROUTES.COACH_PLAYERS, icon: Users },
  { label: 'Player Cards', href: ROUTES.COACH_PLAYER_CARDS, icon: Award },
  { label: 'AI Analytics', href: ROUTES.COACH_AI_ANALYTICS, icon: Sparkles, badge: 'AI' },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.TEACHER_DASHBOARD, icon: Home },
  { label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  {
    label: 'Classes',
    href: ROUTES.TEACHER_CLASSES,
    icon: Users,
    children: [
      { label: 'My Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
      { label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: GraduationCap },
    ],
  },
  { label: 'Timetable', href: ROUTES.TEACHER_TIMETABLE, icon: Clock },
  { label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList },
  { label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI' },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList },
  { label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  {
    label: 'Courses',
    href: ROUTES.TEACHER_COURSES,
    icon: GraduationCap,
    module: 'courses',
  },
  {
    label: 'Communication',
    href: ROUTES.TEACHER_MESSAGES,
    icon: MessageSquare,
    children: [
      { label: 'Messages', href: ROUTES.TEACHER_MESSAGES, icon: MessageSquare },
      { label: 'Notice Board', href: ROUTES.TEACHER_NOTICE_BOARD, icon: Clipboard },
      { label: 'Announcements', href: ROUTES.TEACHER_COMMUNICATION, icon: Megaphone, module: 'communication' },
      { label: 'Meetings', href: ROUTES.TEACHER_MEETINGS, icon: CalendarCheck },
      { label: 'Conferences', href: ROUTES.TEACHER_CONFERENCES, icon: Users, module: 'conference_booking' },
    ],
  },
  {
    label: 'Virtual Classroom',
    href: ROUTES.TEACHER_CLASSROOM,
    icon: Video,
    children: [
      { label: 'My Sessions', href: ROUTES.TEACHER_CLASSROOM, icon: Video },
      { label: 'Video Library', href: ROUTES.TEACHER_CLASSROOM_VIDEOS, icon: PlayCircle },
    ],
  },
  {
    label: 'Student Welfare',
    href: ROUTES.TEACHER_DISCIPLINE,
    icon: Shield,
    children: [
      { label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield },
      { label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
      { label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor' },
    ],
  },
  {
    label: 'Reporting',
    href: ROUTES.TEACHER_REPORTS,
    icon: BarChart3,
    children: [
      { label: 'Reports', href: ROUTES.TEACHER_REPORTS, icon: BarChart3 },
      { label: 'Report Comments', href: ROUTES.TEACHER_AI_REPORT_COMMENTS, icon: FileText, badge: 'AI' },
    ],
  },
  { label: 'Term Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays, module: 'teacher_workbench' },
  { label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  // ─── Permission-gated (Special Roles) ──────────────────────────────
  { label: 'HOD Oversight', href: ROUTES.TEACHER_HOD, icon: Users, permission: 'isHOD' },
  { label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, permission: 'isHOD', module: 'courses' },
];

export const STANDALONE_TEACHER_NAV: NavItem[] = [
  { label: 'Home', href: ROUTES.TEACHER_DASHBOARD, icon: Home },
  { label: 'Teaching Groups', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { label: 'Textbooks', href: '/teacher/curriculum/textbooks', icon: BookMarked },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList },
  { label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI' },
  { label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { label: 'Billing', href: '/my/billing', icon: CreditCard },
  { label: 'Settings', href: '/teacher/settings', icon: Settings },
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
  { id: 'careers', name: 'Career Guidance', description: 'University guidance, APS calculator, and career planning' },
  { id: 'incident_wellbeing', name: 'Incidents & Wellbeing', description: 'Incident reporting, wellbeing surveys, mood tracking' },
] as const;

export const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
] as const;

export const GRADE_LEVELS = [
  'Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
] as const;
