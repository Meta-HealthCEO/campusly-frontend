import { describe, expect, it } from 'vitest';
import { moduleForTeacherPath, teacherModuleGate } from '../src/lib/teacher-module-routes';

describe('moduleForTeacherPath', () => {
  it.each([
    ['/teacher/workbench/marking-hub', 'teacher_workbench'],
    ['/teacher/workbench', 'teacher_workbench'],
    ['/teacher/courses/abc/edit', 'courses'],
    ['/teacher/incidents/123', 'incident_wellbeing'],
    ['/teacher/curriculum/mark-papers', 'ai_tools'],
    ['/teacher/homework/new', 'homework'],
  ])('knows %s needs %s', (path, module) => {
    expect(moduleForTeacherPath(path)?.module).toBe(module);
  });

  it('does not treat a longer word as the same route', () => {
    expect(moduleForTeacherPath('/teacher/leaves')).toBeNull();
  });

  it("leaves pastoral care open: /api/pastoral has no module gate, only the counsellor permission", () => {
    expect(moduleForTeacherPath('/teacher/pastoral')).toBeNull();
    expect(moduleForTeacherPath('/teacher/pastoral/students/abc')).toBeNull();
    expect(moduleForTeacherPath('/teacher/referral')).toBeNull();
  });

  it('leaves core pages open', () => {
    expect(moduleForTeacherPath('/teacher')).toBeNull();
    expect(moduleForTeacherPath('/teacher/grades')).toBeNull();
  });
});

describe('teacherModuleGate', () => {
  const base = { pathname: '/teacher/workbench/marking-hub', schoolError: null };

  it('waits while the school is still loading instead of firing calls that 403', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: null })).toEqual({ kind: 'checking' });
  });

  it('says a switched-off module is off, with its name', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: ['academic'] })).toEqual({ kind: 'off', label: 'Teacher Workbench' });
  });

  it('opens the page when the module is on', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: ['teacher_workbench'] })).toEqual({ kind: 'open' });
  });

  it('opens the page if the school could not be loaded, rather than spinning forever', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: null, schoolError: 'Network Error' })).toEqual({ kind: 'open' });
  });

  it('never gates a page that needs no module', () => {
    expect(teacherModuleGate({ pathname: '/teacher/grades', modulesEnabled: null, schoolError: null })).toEqual({ kind: 'open' });
  });
});
