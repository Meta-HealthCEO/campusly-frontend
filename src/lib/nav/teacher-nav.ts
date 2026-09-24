import {
  AlertTriangle, Award, BarChart3, BookMarked, BookOpen, CalendarCheck, CalendarDays, CheckSquare, Clipboard, ClipboardCheck, ClipboardList, Clock, CreditCard, FileText, GraduationCap, Heart, HeartHandshake, Home, Megaphone, MessageSquare, PlayCircle, Repeat, ScrollText, Settings, Shield, Users, Video,
} from 'lucide-react';
import type { NavItem } from '../constants';
import { ROUTES } from '../routes';

/** Teacher portal navigation (school and standalone). Re-exported from constants. */
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
  { label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList, module: 'attendance' },
  { label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  {
    label: 'Marking',
    href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB,
    icon: ClipboardCheck,
    badge: 'AI',
    module: 'teacher_workbench',
  },
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
      { label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield, module: 'attendance' },
      { label: 'Merits', href: ROUTES.TEACHER_MERITS, icon: Award, module: 'attendance' },
      { label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
      { label: 'Refer to counsellor', href: ROUTES.TEACHER_REFERRAL, icon: HeartHandshake },
      { label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor' },
    ],
  },
  {
    label: 'Reporting',
    href: ROUTES.TEACHER_REPORTS,
    icon: BarChart3,
    children: [
      { label: 'Reports', href: ROUTES.TEACHER_REPORTS, icon: BarChart3 },
      { label: 'Report Comments', href: ROUTES.TEACHER_AI_REPORT_COMMENTS, icon: FileText, badge: 'AI', module: 'ai_tools' },
    ],
  },
  { label: 'Term Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays, module: 'teacher_workbench' },
  { label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Repeat, module: 'attendance' },
  { label: 'Policies', href: ROUTES.TEACHER_POLICIES, icon: ScrollText },
  // ─── Permission-gated (Special Roles) ──────────────────────────────
  { label: 'HOD Oversight', href: ROUTES.TEACHER_HOD, icon: Users, permission: 'isHOD' },
  { label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, permission: 'isHOD', module: 'courses' },
];

export const STANDALONE_TEACHER_NAV: NavItem[] = [
  { label: 'Home', href: ROUTES.TEACHER_DASHBOARD, icon: Home },
  { label: 'Teaching Groups', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { label: 'Textbooks', href: '/teacher/curriculum/textbooks', icon: BookMarked },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  { label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  {
    label: 'Marking',
    href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB,
    icon: ClipboardCheck,
    badge: 'AI',
    module: 'teacher_workbench',
  },
  { label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { label: 'Billing', href: '/my/billing', icon: CreditCard },
  { label: 'Settings', href: '/teacher/settings', icon: Settings },
];
