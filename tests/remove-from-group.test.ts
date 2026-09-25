import { describe, expect, it } from 'vitest';
import {
  isInAnotherGroup,
  removalOutcome,
  removeFromGroupCopy,
  removeFromGroupRequest,
  removedToast,
} from '../src/lib/roster-removal';
import { readSource } from './support/source';

describe('removeFromGroupRequest (backend task A9)', () => {
  it('names the group as a query param on DELETE /students/:id', () => {
    expect(removeFromGroupRequest('st-1', 'class-1')).toEqual({
      url: '/students/st-1',
      config: { params: { classId: 'class-1' } },
    });
  });
});

describe('removalOutcome', () => {
  it('reads what the A9 backend did', () => {
    expect(removalOutcome({ removed: 'group' })).toBe('group');
    expect(removalOutcome({ removed: 'learner' })).toBe('learner');
  });

  it('treats the current backend, which answers without data, as a full removal', () => {
    // unwrapResponse hands back the whole body when there is no `data` key.
    expect(removalOutcome({ success: true, message: 'Student deleted successfully' })).toBe('learner');
    expect(removalOutcome(undefined)).toBe('learner');
    expect(removalOutcome(null)).toBe('learner');
    expect(removalOutcome({ removed: 'something else' })).toBe('learner');
  });
});

describe('isInAnotherGroup', () => {
  const entries = [
    { class: { id: 'class-1' }, students: [{ id: 'st-1' }, { id: 'st-2' }] },
    { class: { id: 'class-1' }, students: [{ id: 'st-1' }, { id: 'st-2' }] }, // same class, second subject
    { class: { _id: 'class-2' }, students: [{ id: 'st-1' }] },
  ];

  it('is true when the learner is on another of the teacher\'s groups', () => {
    expect(isInAnotherGroup(entries, 'st-1', 'class-1')).toBe(true);
    expect(isInAnotherGroup(entries, 'st-1', 'class-2')).toBe(true);
  });

  it('ignores the same group listed twice (one class, two subjects)', () => {
    expect(isInAnotherGroup(entries, 'st-2', 'class-1')).toBe(false);
  });

  it('is false for a learner in no group at all', () => {
    expect(isInAnotherGroup(entries, 'st-9', 'class-1')).toBe(false);
    expect(isInAnotherGroup([], 'st-1', 'class-1')).toBe(false);
  });
});

describe('removeFromGroupCopy', () => {
  const base = { name: 'Thandi Mokoena', groupName: 'Grade 10 Maths', learnerLabel: 'Learner' };

  it('says the learner stays in the teacher\'s other groups', () => {
    expect(removeFromGroupCopy({ ...base, inOtherGroups: true, hasLogin: true })).toEqual({
      title: 'Remove Thandi Mokoena from Grade 10 Maths?',
      description: 'They stay in your other groups.',
      confirmLabel: 'Remove from this group',
    });
  });

  it('says a learner in no other group is removed and loses their sign-in', () => {
    const copy = removeFromGroupCopy({ ...base, inOtherGroups: false, hasLogin: true });
    expect(copy.title).toBe('Remove Thandi Mokoena from Grade 10 Maths?');
    expect(copy.description).toBe('This is their only group with you, so they are removed from Campusly and can no longer sign in.');
    expect(copy.confirmLabel).toBe('Remove learner');
  });

  it('does not mention signing in for a roster-only learner', () => {
    const copy = removeFromGroupCopy({ ...base, learnerLabel: 'Student', inOtherGroups: false, hasLogin: false });
    expect(copy.description).toBe('This is their only group with you, so they are removed from Campusly.');
    expect(copy.confirmLabel).toBe('Remove student');
  });
});

describe('removedToast', () => {
  it('reports what the server did', () => {
    expect(removedToast('Thandi Mokoena', 'Grade 10 Maths', 'group')).toBe('Thandi Mokoena removed from Grade 10 Maths');
    expect(removedToast('Thandi Mokoena', 'Grade 10 Maths', 'learner')).toBe('Thandi Mokoena removed');
  });
});

describe('the roster removes a learner from its own group', () => {
  it('the hook sends the group with the delete', () => {
    const hook = readSource('src/hooks/useTeacherClasses.ts');
    expect(hook).toContain('removeFromGroupRequest(studentId, classId)');
    expect(hook).not.toMatch(/apiClient\.delete\(`\/students\/\$\{studentId\}`\)/);
  });

  it('the roster page passes its group and asks first', () => {
    const page = readSource('src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx');
    expect(page).toMatch(/removeStudent\(student\.id, classId\)/);
    expect(page).toContain('<RemoveFromGroupDialog');
  });
});
