import { describe, it, expect } from 'vitest';
import { userFromApi } from '../src/lib/user-from-api';

const apiUser = {
  _id: 'u1', email: 'a@z.test', firstName: 'Ayanda', lastName: 'Zulu', role: 'teacher', schoolId: 's1',
  isActive: true, isHOD: true, departmentId: 'd1', profileImage: 'p.png', createdAt: '2026-09-23', updatedAt: '2026-09-24',
};

describe('userFromApi', () => {
  it("keeps an HOD's department, which the HOD pages and paper review need", () => {
    const user = userFromApi(apiUser);
    expect(user.isHOD).toBe(true);
    expect(user.departmentId).toBe('d1');
  });

  it('maps the id, avatar and school_admin role the way the app expects', () => {
    const user = userFromApi({ ...apiUser, role: 'school_admin', departmentId: undefined });
    expect(user).toMatchObject({ id: 'u1', role: 'admin', avatar: 'p.png', phone: '', departmentId: null });
  });

  it('treats missing flags as false', () => {
    const user = userFromApi({ _id: 'u2', email: 'b@z.test', firstName: 'B', lastName: 'C', role: 'parent' });
    expect(user).toMatchObject({ isHOD: false, isSchoolPrincipal: false, isStandaloneTeacher: false, isActive: true, schoolId: '' });
  });
});
