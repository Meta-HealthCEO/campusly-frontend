/**
 * Whether a teaching-load fetch should run. Dialogs that embed a data-fetching
 * hook (e.g. the referral dialog's class list) must gate it on their own open
 * state, or the fetch fires on every mount of the page that renders them —
 * even while the dialog stays closed.
 */
export function shouldLoadTeacherClasses(enabled: boolean): boolean {
  return enabled;
}
