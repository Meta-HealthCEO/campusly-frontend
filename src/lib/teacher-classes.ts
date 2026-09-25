/**
 * Whether a teaching-load fetch should run. Dialogs that embed a data-fetching
 * hook (e.g. the referral dialog's class list) must gate it on their own open
 * state, or the fetch fires on every mount of the page that renders them —
 * even while the dialog stays closed.
 */
export function shouldLoadTeacherClasses(enabled: boolean): boolean {
  return enabled;
}

/**
 * The My classes page title and description. Standalone teachers see the
 * nav's name and only what their portal has; school teachers keep theirs
 * (`schoolDescription` is the page's own, which depends on their classes).
 */
export function classesPageCopy(isStandalone: boolean, schoolDescription: string): { title: string; description: string } {
  if (!isStandalone) return { title: 'My Classes', description: schoolDescription };
  return {
    title: 'My classes',
    description: 'Your teaching groups by grade and subject. Learners join a group with its code at /register-student; homework, lessons and marks follow the group.',
  };
}
