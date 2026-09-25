import {
  AlertTriangle, BarChart3, BookMarked, BookOpen, CalendarDays, CheckSquare,
  Clipboard, ClipboardCheck, ClipboardList, Clock, CreditCard, FileText, GraduationCap, Heart,
  Library, MessageSquare, PlayCircle, Repeat, ScrollText, Settings,
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
  // One behaviour log (merits, demerits, incidents); serious incidents and referrals open from its page.
  { section: 'Class', label: 'Behaviour', href: ROUTES.TEACHER_BEHAVIOUR, icon: Shield, module: 'attendance' },
  // Without attendance there is no Behaviour page, so incident reporting needs its own way in.
  { section: 'Class', label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing', unlessModule: 'attendance' },
  // /api/pastoral has no module gate: counsellors see this whatever modules the school has.
  { section: 'Class', label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor' },

  { section: 'Talk', label: 'Messages', href: ROUTES.TEACHER_MESSAGES, icon: MessageSquare, countKey: 'messages' },
  // Class notices tell a class's learners and parents; email/SMS to parents opens from there.
  { section: 'Talk', label: 'Class notices', href: ROUTES.TEACHER_NOTICE_BOARD, icon: Clipboard },
  // One parent-evening engine (Conferences); the old Meetings pages redirect here.
  { section: 'Talk', label: 'Parent meetings', href: ROUTES.TEACHER_CONFERENCES, icon: Users, module: 'conference_booking' },

  { section: 'Me', label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { section: 'Me', label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Repeat, module: 'attendance' },
  { section: 'Me', label: 'Policies', href: ROUTES.TEACHER_POLICIES, icon: ScrollText },
  { section: 'Me', label: 'HOD Oversight', href: ROUTES.TEACHER_HOD, icon: Users, permission: 'isHOD' },
  { section: 'Me', label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, permission: 'isHOD', module: 'courses' },
];

/**
 * Standalone (self-sign-up) teachers: the launch portal (spec §1). "Lessons"
 * are the AI class units (/teacher/courses), not the old lesson-plan tool;
 * Assignments and the Library are not part of it.
 */
export const STANDALONE_TEACHER_NAV: NavItem[] = [
  { section: 'Today', label: 'Today', href: ROUTES.TEACHER_DASHBOARD, icon: Sunrise },
  { section: 'Teach', label: 'Lessons', href: ROUTES.TEACHER_COURSES, icon: BookOpen, badge: 'AI' },
  { section: 'Teach', label: 'Textbooks', href: '/teacher/curriculum/textbooks', icon: BookMarked },
  { section: 'Assess', label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { section: 'Assess', label: 'Test papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  {
    section: 'Assess', label: 'Marking', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck,
    badge: 'AI', module: 'teacher_workbench', countKey: 'marking',
  },
  { section: 'Assess', label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { section: 'Class', label: 'My classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { section: 'Class', label: 'Register', href: ROUTES.TEACHER_ATTENDANCE, icon: CheckSquare, module: 'attendance' },
  { section: 'Me', label: 'Billing', href: '/my/billing', icon: CreditCard },
  { section: 'Me', label: 'Settings', href: '/teacher/settings', icon: Settings },
];
