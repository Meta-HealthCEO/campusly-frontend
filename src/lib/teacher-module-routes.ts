export interface TeacherRouteModule {
  prefix: string;
  /** The backend `requireModule(...)` id; these ids need no alias normalisation. */
  module: string;
  label: string;
}

/** Teacher pages whose data comes from an API behind `requireModule` in the backend's app.ts. */
export const TEACHER_ROUTE_MODULES: readonly TeacherRouteModule[] = [
  { prefix: '/teacher/workbench', module: 'teacher_workbench', label: 'Teacher Workbench' },
  { prefix: '/teacher/curriculum/mark-papers', module: 'ai_tools', label: 'AI Teacher Tools' },
  { prefix: '/teacher/ai-tools', module: 'ai_tools', label: 'AI Teacher Tools' },
  { prefix: '/teacher/communication', module: 'communication', label: 'Communication' },
  { prefix: '/teacher/conferences', module: 'conference_booking', label: 'Parent-Teacher Conferences' },
  { prefix: '/teacher/courses', module: 'courses', label: 'Courses' },
  { prefix: '/teacher/incidents', module: 'incident_wellbeing', label: 'Incidents and Wellbeing' },
  { prefix: '/teacher/learning', module: 'learning', label: 'Learning' },
  { prefix: '/teacher/leave', module: 'staff_leave', label: 'Staff Leave' },
  { prefix: '/teacher/attendance', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/behaviour', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/substitutes', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/homework', module: 'homework', label: 'Homework' },
  { prefix: '/teacher/assignments', module: 'homework', label: 'Homework' },
];

export function moduleForTeacherPath(pathname: string): TeacherRouteModule | null {
  return TEACHER_ROUTE_MODULES.find(
    ({ prefix }: TeacherRouteModule) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) ?? null;
}

export type ModuleGateState = { kind: 'open' } | { kind: 'checking' } | { kind: 'off'; label: string };

export function teacherModuleGate(input: {
  pathname: string;
  modulesEnabled: string[] | null;
  schoolError: string | null;
}): ModuleGateState {
  const rule = moduleForTeacherPath(input.pathname);
  if (!rule) return { kind: 'open' };
  if (input.modulesEnabled === null) return input.schoolError ? { kind: 'open' } : { kind: 'checking' };
  return input.modulesEnabled.includes(rule.module) ? { kind: 'open' } : { kind: 'off', label: rule.label };
}
