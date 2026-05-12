import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, BookOpen, ClipboardList, FileText, Sparkles, User,
  Calendar, Award, Wallet, Library, Trophy, Activity, Heart,
  Briefcase, Folder, Video,
} from 'lucide-react';
import type { ModuleKey } from '@/hooks/useStudentModules';

export interface StudentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: ModuleKey;
}

// Phase 1 — always visible
export const PHASE_1_NAV: StudentNavItem[] = [
  { label: 'Dashboard', href: '/student',            icon: LayoutDashboard },
  { label: 'Lessons',   href: '/student/lessons',    icon: BookOpen },
  { label: 'Homework',  href: '/student/homework',   icon: ClipboardList },
  { label: 'Tests',     href: '/student/tests',      icon: FileText },
  { label: 'AI Tutor',  href: '/student/ai-tutor',   icon: Sparkles },
  { label: 'Profile',   href: '/student/profile',    icon: User },
];

// Phase 2 — gated by school.modulesEnabled
export const PHASE_2_NAV: StudentNavItem[] = [
  { label: 'Timetable',     href: '/student/timetable',     icon: Calendar,  module: 'academic' },
  { label: 'Grades',        href: '/student/grades',        icon: Award,     module: 'academic' },
  { label: 'Wallet',        href: '/student/wallet',        icon: Wallet,    module: 'wallet' },
  { label: 'Library',       href: '/student/library',       icon: Library,   module: 'library' },
  { label: 'Achievements',  href: '/student/achievements',  icon: Trophy,    module: 'achiever' },
  { label: 'Sports',        href: '/student/sports',        icon: Activity,  module: 'sports' },
  { label: 'Wellbeing',     href: '/student/wellbeing',     icon: Heart,     module: 'incident_wellbeing' },
  { label: 'Careers',       href: '/student/careers',       icon: Briefcase, module: 'careers' },
  { label: 'Portfolio',     href: '/student/portfolio',     icon: Folder,    module: 'portfolio' },
  { label: 'Classroom',     href: '/student/classroom',     icon: Video,     module: 'academic' },
];
