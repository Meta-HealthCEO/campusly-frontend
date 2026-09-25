import { BarChart3, BookOpen, ClipboardList, FileText, Sparkles, Sunrise, User } from 'lucide-react';
import type { NavItem } from '../constants';

/**
 * A standalone teacher's learners: only what their teacher uses (spec §2).
 * "Lessons" are the teacher's units; projects are inside Homework; the AI
 * tutor's practice and history pages are reachable from it.
 */
export const STANDALONE_STUDENT_NAV: NavItem[] = [
  { label: 'Today', href: '/student', icon: Sunrise },
  { label: 'Lessons', href: '/student/courses', icon: BookOpen },
  { label: 'Homework', href: '/student/homework', icon: ClipboardList },
  { label: 'Tests', href: '/student/tests', icon: FileText },
  { label: 'Marks', href: '/student/grades', icon: BarChart3 },
  { label: 'AI tutor', href: '/student/ai-tutor', icon: Sparkles },
  { label: 'Profile', href: '/student/profile', icon: User },
];
