import {
  AlertTriangle, Award, BarChart3, BookMarked, BookOpen, CalendarCheck, CalendarDays, CheckSquare,
  Clipboard, ClipboardCheck, ClipboardList, Clock, CreditCard, FileText, GraduationCap, Heart,
  HeartHandshake, Library, Megaphone, MessageSquare, PlayCircle, Repeat, ScrollText, Settings,
  Shield, Sunrise, Users, Video,
} from 'lucide-react';
import type { NavItem } from '../constants';
import { ROUTES } from '../routes';

/** Teacher portal navigation in six sections (programme plan §3). Re-exported from constants. */
export const TEACHER_NAV: NavItem[] = [
  { section: 'Today', label: 'Today', href: ROUTES.TEACHER_DASHBOARD, icon: Sunrise },

  { section: 'Teach', label: 'Courses', href: ROUTES.TEACHER_COURSES, icon: GraduationCap, module: 'courses' },
  { section: 'Teach', label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { section: 'Teach', label: 'Library', href: '/teacher/curriculum/content', icon: Library },
  { section: 'Teach', label: 'Live classes', href: ROUTES.TEACHER_CLASSROOM, icon: Video },
  { section: 'Teach', label: 'Video library', href: ROUTES.TEACHER_CLASSROOM_VIDEOS, icon: PlayCircle },

  { section: 'Assess', label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { section: 'Assess', label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { section: 'Assess', label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  {
    section: 'Assess', label: 'Marking', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck,
    badge: 'AI', module: 'teacher_workbench', countKey: 'marking',
  },
  { section: 'Assess', label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { section: 'Assess', label: 'Term Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays, module: 'teacher_workbench' },

  { section: 'Class', label: 'My Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { section: 'Class', label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: GraduationCap },
  { section: 'Class', label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList, module: 'attendance' },
  { section: 'Class', label: 'Timetable', href: ROUTES.TEACHER_TIMETABLE, icon: Clock },
  { section: 'Class', label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield, module: 'attendance' },
  { section: 'Class', label: 'Merits', href: ROUTES.TEACHER_MERITS, icon: Award, module: 'attendance' },
  { section: 'Class', label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
  { section: 'Class', label: 'Refer to counsellor', href: ROUTES.TEACHER_REFERRAL, icon: HeartHandshake },
  // /api/pastoral has no module gate: counsellors see this whatever modules the school has.
  { section: 'Class', label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor' },

  { section: 'Talk', label: 'Messages', href: ROUTES.TEACHER_MESSAGES, icon: MessageSquare, countKey: 'messages' },
  { section: 'Talk', label: 'Announcements', href: ROUTES.TEACHER_COMMUNICATION, icon: Megaphone, module: 'communication' },
  { section: 'Talk', label: 'Notice Board', href: ROUTES.TEACHER_NOTICE_BOARD, icon: Clipboard },
  { section: 'Talk', label: 'Meetings', href: ROUTES.TEACHER_MEETINGS, icon: CalendarCheck },
  { section: 'Talk', label: 'Conferences', href: ROUTES.TEACHER_CONFERENCES, icon: Users, module: 'conference_booking' },

  { section: 'Me', label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { section: 'Me', label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Repeat, module: 'attendance' },
  { section: 'Me', label: 'Policies', href: ROUTES.TEACHER_POLICIES, icon: ScrollText },
  { section: 'Me', label: 'HOD Oversight', href: ROUTES.TEACHER_HOD, icon: Users, permission: 'isHOD' },
  { section: 'Me', label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, permission: 'isHOD', module: 'courses' },
];

export const STANDALONE_TEACHER_NAV: NavItem[] = [
  { section: 'Today', label: 'Today', href: ROUTES.TEACHER_DASHBOARD, icon: Sunrise },
  { section: 'Teach', label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { section: 'Teach', label: 'Textbooks', href: '/teacher/curriculum/textbooks', icon: BookMarked },
  { section: 'Assess', label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { section: 'Assess', label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { section: 'Assess', label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  {
    section: 'Assess', label: 'Marking', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck,
    badge: 'AI', module: 'teacher_workbench', countKey: 'marking',
  },
  { section: 'Assess', label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { section: 'Class', label: 'Teaching Groups', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { section: 'Me', label: 'Billing', href: '/my/billing', icon: CreditCard },
  { section: 'Me', label: 'Settings', href: '/teacher/settings', icon: Settings },
];
