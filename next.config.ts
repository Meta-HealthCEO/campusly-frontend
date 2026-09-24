import type { NextConfig } from "next";

/**
 * Teacher URLs whose pages were removed or merged (programme plan §2.1).
 * Kept as redirects so bookmarks and old links still land somewhere useful.
 * Route params must match the destination folder names (e.g. papers/[id]).
 */
export const LEGACY_TEACHER_REDIRECTS: { source: string; destination: string; permanent: boolean }[] = [
  { source: '/teacher/lesson-plans', destination: '/teacher/lessons', permanent: true },
  { source: '/teacher/lesson-plans/:id', destination: '/teacher/lessons/:id', permanent: true },
  { source: '/teacher/quick-make', destination: '/teacher/lessons', permanent: true },
  { source: '/teacher/ai-tools/grading', destination: '/teacher/curriculum/mark-papers', permanent: true },
  { source: '/teacher/ai-tools/papers', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/ai-tools/papers/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/curriculum/assessments', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/curriculum/assessments/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/curriculum/papers', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/curriculum/papers/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/workbench/papers/builder', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/workbench/question-bank', destination: '/teacher/curriculum/questions', permanent: true },
  { source: '/teacher/workbench/papers/:id/memo', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/workbench/student-360/:id', destination: '/teacher/students/:id', permanent: true },
  // Phase 2C: report cards, report comments and weightings live in the gradebook.
  { source: '/teacher/reports', destination: '/teacher/grades?tab=reports', permanent: false },
  { source: '/teacher/ai-tools/report-comments', destination: '/teacher/grades?tab=reports', permanent: false },
  { source: '/teacher/curriculum/assessment-structure', destination: '/teacher/grades?tab=weightings', permanent: false },
  { source: '/teacher/curriculum/assessment-structure/:id', destination: '/teacher/grades?tab=weightings', permanent: false },
  // Phase 2B: moderation status lives on the papers list.
  { source: '/teacher/workbench/papers/moderation', destination: '/teacher/papers?moderation=pending', permanent: false },
];

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_TEACHER_REDIRECTS;
  },
};

export default nextConfig;
