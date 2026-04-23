import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { can, type Capability } from '../src/lib/permissions';
import type { User } from '../src/types';

const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../src/lib/permissions.snapshot.json'), 'utf8'),
) as Record<string, Record<Capability, boolean>>;

function archetype(overrides: Partial<User>): User {
  return {
    id: 'archetype',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    role: 'teacher',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as User;
}

const ARCHETYPES: Record<string, User> = {
  super_admin:         archetype({ role: 'super_admin' }),
  school_admin:        archetype({ role: 'school_admin' }),
  teacher_plain:       archetype({ role: 'teacher' }),
  teacher_principal:   archetype({ role: 'teacher', isSchoolPrincipal: true }),
  teacher_standalone:  archetype({ role: 'teacher', isSchoolPrincipal: true, isStandaloneTeacher: true }),
  teacher_hod:         archetype({ role: 'teacher', isHOD: true }),
  teacher_bursar:      archetype({ role: 'teacher', isBursar: true }),
  teacher_counselor:   archetype({ role: 'teacher', isCounselor: true }),
  teacher_receptionist:archetype({ role: 'teacher', isReceptionist: true }),
  parent:              archetype({ role: 'parent' }),
  student:             archetype({ role: 'student' }),
  sports_manager:      archetype({ role: 'sports_manager' }),
  coach_standalone:    archetype({ role: 'coach', isStandaloneCoach: true }),
};

describe('permissions snapshot', () => {
  it('covers every archetype in the snapshot', () => {
    expect(Object.keys(ARCHETYPES).sort()).toEqual(Object.keys(snapshot).sort());
  });

  for (const [name, user] of Object.entries(ARCHETYPES)) {
    describe(name, () => {
      const expected = snapshot[name];
      for (const cap of Object.keys(expected) as Capability[]) {
        it(`${cap} → ${expected[cap]}`, () => {
          expect(can(user, cap)).toBe(expected[cap]);
        });
      }
    });
  }

  it('null user gets no capability', () => {
    expect(can(null, 'manage_school_config')).toBe(false);
  });
});
