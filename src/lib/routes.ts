// ============================================================
// Route constants — every internal path used by nav + links.
// Split from constants.ts (re-exported there) for file-size budget.
// ============================================================

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
  ADMIN_SPORT_PLAYER_CARDS: '/admin/sport/player-cards',
  ADMIN_SPORT_AI_ANALYTICS: '/admin/sport/ai-analytics',
  ADMIN_SPORT_COACHES: '/admin/sport/coaches',

  // Coach portal
  COACH_DASHBOARD: '/coach',
  COACH_ONBOARDING: '/coach/onboarding',
  COACH_TEAMS: '/coach/teams',
  COACH_FIXTURES: '/coach/fixtures',
  COACH_SEASONS: '/coach/seasons',
  COACH_RESULTS: '/coach/results',
  COACH_TRAINING: '/coach/training',
  COACH_DRILLS: '/coach/drills',
  COACH_INJURIES: '/coach/injuries',
  COACH_FITNESS: '/coach/fitness',
  COACH_ANNOUNCEMENTS: '/coach/announcements',
  COACH_PLAYERS: '/coach/players',
  COACH_PLAYER_CARDS: '/coach/player-cards',
  COACH_AI_ANALYTICS: '/coach/ai-analytics',
  ADMIN_WHATSAPP_SETTINGS: '/admin/settings/whatsapp',
  ADMIN_ACHIEVER: '/admin/achiever',
  ADMIN_ACHIEVER_HOUSES: '/admin/achiever/houses',
  ADMIN_ACHIEVER_AWARDS: '/admin/achiever/awards',
  ADMIN_CONSENT: '/admin/consent',
  ADMIN_LIBRARY: '/admin/library',
  ADMIN_ONLINE_PAYMENTS: '/admin/fees/online-payments',
  ADMIN_ACCOUNTING: '/admin/fees/accounting',
  ADMIN_PAYMENT_SETTINGS: '/admin/settings/payments',
  ADMIN_MEETINGS: '/admin/meetings',
  ADMIN_SCHOOL_NEWS: '/admin/school-news',
  ADMIN_TIMETABLE_BUILDER: '/admin/timetable-builder',
  ADMIN_PRINCIPAL: '/admin/principal',
  ADMIN_BURSAR: '/admin/bursar',
  ADMIN_RECEPTION: '/admin/reception',
  ADMIN_PERMISSIONS: '/admin/settings/permissions',
  ADMIN_LEAVE: '/admin/leave',
  ADMIN_SUBSTITUTES: '/admin/substitutes',
  ADMIN_CONFERENCES: '/admin/conferences',
  ADMIN_COMM_CONFIG: '/admin/settings/communication',
  ADMIN_COMM_TEMPLATES: '/admin/settings/communication/templates',
  ADMIN_COMM_DASHBOARD: '/admin/communication/dashboard',
  ADMIN_COMM_LOG: '/admin/communication/log',

  // Admin — Admissions
  ADMIN_ADMISSIONS: '/admin/admissions',
  ADMIN_ADMISSIONS_CAPACITY: '/admin/admissions/capacity',
  ADMIN_ADMISSIONS_REPORTS: '/admin/admissions/reports',

  // Admin — Budget
  ADMIN_BUDGET: '/admin/budget',

  // Admin — Incidents & Wellbeing
  ADMIN_INCIDENTS: '/admin/incidents',
  ADMIN_WELLBEING: '/admin/wellbeing',

  // Teacher — Incidents
  TEACHER_INCIDENTS: '/teacher/incidents',

  // Student — Wellbeing
  STUDENT_WELLBEING: '/student/wellbeing',

  // Parent — Admissions
  PARENT_ADMISSIONS: '/parent/admissions',

  // Parent
  PARENT_DASHBOARD: '/parent',
  PARENT_WALLET: '/parent/wallet',
  PARENT_FEES: '/parent/fees',
  PARENT_ACADEMICS: '/parent/academics',
  PARENT_ATTENDANCE: '/parent/attendance',
  PARENT_COMMUNICATION: '/parent/communication',
  PARENT_MESSAGES: '/parent/messages',
  PARENT_EVENTS: '/parent/events',
  PARENT_CONSENT: '/parent/consent',
  PARENT_TUCKSHOP: '/parent/tuckshop',
  PARENT_TRANSPORT: '/parent/transport',
  PARENT_LOST_FOUND: '/parent/lost-found',
  PARENT_LIBRARY: '/parent/library',
  PARENT_MEETINGS: '/parent/meetings',
  PARENT_NOTICE_BOARD: '/parent/notice-board',
  PARENT_DIGEST: '/parent/digest',
  PARENT_HOMEWORK: '/parent/homework',
  PARENT_SPORTS: '/parent/sports',
  PARENT_CONFERENCES: '/parent/conferences',
  PARENT_SETTINGS: '/parent/settings',

  // Student
  STUDENT_DASHBOARD: '/student',
  STUDENT_CLASSES: '/student/classes',
  STUDENT_HOMEWORK: '/student/homework',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_GRADES: '/student/grades',
  STUDENT_LIBRARY: '/student/library',
  STUDENT_ACHIEVEMENTS: '/student/achievements',
  STUDENT_WALLET: '/student/wallet',
  STUDENT_SPORTS: '/student/sports',

  // Student — AI Tutor
  STUDENT_AI_TUTOR: '/student/ai-tutor',
  STUDENT_AI_PRACTICE: '/student/ai-tutor/practice',

  // Parent — AI Assistant
  PARENT_AI_ASSISTANT: '/parent/ai-assistant',

  // Teacher — AI Report Comments
  TEACHER_AI_REPORT_COMMENTS: '/teacher/ai-tools/report-comments',

  // Student — Careers
  STUDENT_CAREERS: '/student/careers',
  STUDENT_CAREERS_EXPLORE: '/student/careers/explore',
  STUDENT_CAREERS_APPLICATIONS: '/student/careers/applications',
  STUDENT_CAREERS_APTITUDE: '/student/careers/aptitude',
  STUDENT_CAREERS_CAREERS: '/student/careers/careers',
  STUDENT_CAREERS_SUBJECTS: '/student/careers/subjects',
  STUDENT_CAREERS_BURSARIES: '/student/careers/bursaries',
  STUDENT_PORTFOLIO: '/student/portfolio',

  // Parent — Careers
  PARENT_CAREERS: '/parent/careers',
  PARENT_PORTFOLIO: '/parent/portfolio',

  // Admin — Courses
  ADMIN_COURSES: '/admin/courses',
  ADMIN_COURSES_REVIEW: '/admin/courses/review',

  // Admin — Careers
  ADMIN_CAREERS_UNIVERSITIES: '/admin/careers/universities',
  ADMIN_CAREERS_PROGRAMMES: '/admin/careers/programmes',
  ADMIN_CAREERS_BURSARIES: '/admin/careers/bursaries',

  // Teacher
  TEACHER_DASHBOARD: '/teacher',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_GRADES: '/teacher/grades',
  TEACHER_HOMEWORK: '/teacher/homework',
  TEACHER_DISCIPLINE: '/teacher/discipline',
  TEACHER_CLASSES: '/teacher/classes',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_TIMETABLE: '/teacher/timetable',
  TEACHER_NOTICE_BOARD: '/teacher/notice-board',
  TEACHER_COMMUNICATION: '/teacher/communication',
  TEACHER_MESSAGES: '/teacher/messages',
  TEACHER_MEETINGS: '/teacher/meetings',
  TEACHER_REPORTS: '/teacher/reports',
  TEACHER_AI_ASSISTANT: '/teacher/ai-assistant',
  TEACHER_AI_TOOLS: '/teacher/ai-tools',
  TEACHER_AI_CREATE_PAPER: '/teacher/ai-tools/create-paper',
  TEACHER_AI_GRADING: '/teacher/ai-tools/grading',
  TEACHER_AI_PAPERS: '/teacher/ai-tools/papers',
  TEACHER_LESSONS: '/teacher/lessons',
  TEACHER_LESSON_NEW: '/teacher/lessons/new',
  TEACHER_SUBSTITUTES: '/teacher/substitutes',

  // Teacher — Virtual Classroom
  TEACHER_CLASSROOM: '/teacher/classroom',
  TEACHER_CLASSROOM_VIDEOS: '/teacher/classroom/videos',

  // Teacher — Permission-gated
  TEACHER_HOD: '/teacher/hod',
  TEACHER_PASTORAL: '/teacher/pastoral',
  TEACHER_LEAVE: '/teacher/leave',
  TEACHER_CONFERENCES: '/teacher/conferences',

  // Teacher — Curriculum
  TEACHER_CURRICULUM_CONTENT: '/teacher/curriculum/content',
  TEACHER_CURRICULUM_QUESTIONS: '/teacher/curriculum/questions',
  TEACHER_CURRICULUM_ASSESSMENTS: '/teacher/curriculum/assessments',
  TEACHER_CURRICULUM_PREVIEW: '/teacher/curriculum/preview',
  TEACHER_CURRICULUM_PAPERS: '/teacher/curriculum/papers',
  TEACHER_CURRICULUM_MARK_PAPERS: '/teacher/curriculum/mark-papers',
  TEACHER_ASSESSMENT_STRUCTURES: '/teacher/curriculum/assessment-structure',

  // Teacher — Courses
  TEACHER_COURSES: '/teacher/courses',
  TEACHER_COURSE_EDIT: (id: string) => `/teacher/courses/${id}/edit`,
  TEACHER_COURSE_ASSIGN: (id: string) => `/teacher/courses/${id}/assign`,
  TEACHER_COURSE_ANALYTICS: (id: string) => `/teacher/courses/${id}/analytics`,

  // Teacher Workbench
  TEACHER_WORKBENCH: '/teacher/workbench',
  TEACHER_WORKBENCH_CURRICULUM: '/teacher/workbench/curriculum',
  TEACHER_WORKBENCH_QUESTION_BANK: '/teacher/workbench/question-bank',
  TEACHER_WORKBENCH_PAPER_BUILDER: '/teacher/workbench/papers/builder',
  TEACHER_WORKBENCH_MODERATION: '/teacher/workbench/papers/moderation',
  TEACHER_WORKBENCH_MARKING_HUB: '/teacher/workbench/marking-hub',
  TEACHER_WORKBENCH_PLANNER: '/teacher/workbench/planner',

  // Tuckshop
  TUCKSHOP_POS: '/tuckshop',

  // Super Admin
  SUPERADMIN_DASHBOARD: '/superadmin',
  SUPERADMIN_SCHOOLS: '/superadmin/schools',
  SUPERADMIN_ONBOARD: '/superadmin/onboard',
  SUPERADMIN_BILLING: '/superadmin/billing',
  SUPERADMIN_SUPPORT: '/superadmin/support',
} as const;
