/**
 * Development-only one-click sign-in: the gate and the pure helpers behind
 * DevSignInPanel and useDevSignIn. The backend has its own gate
 * (NODE_ENV=development + DEV_SIGN_IN=true, loopback callers only).
 */
import type { DevSignInAccount, DevSignInGroups } from '@/types/dev-sign-in';

export interface DevSignInEnv {
  nodeEnv: string | undefined;
  flag: string | undefined;
}

export function isDevSignInEnabled({ nodeEnv, flag }: DevSignInEnv): boolean {
  return nodeEnv === 'development' && flag === 'true';
}

/**
 * Both reads are literal `process.env.X`, so Next inlines them at build time.
 * In a production build the first comparison folds to false and the panel
 * drops out of the bundle.
 */
export const DEV_SIGN_IN_ENABLED =
  process.env.NODE_ENV === 'development' &&
  isDevSignInEnabled({ nodeEnv: process.env.NODE_ENV, flag: process.env.NEXT_PUBLIC_DEV_SIGN_IN });

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  school_admin: 'School admin',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Learner',
  sgb_member: 'SGB member',
  coach: 'Coach',
  sports_manager: 'Sports manager',
};

function isAccount(value: unknown): value is DevSignInAccount {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return ['id', 'name', 'email', 'role', 'detail'].every((key) => typeof row[key] === 'string')
    && typeof row.isOwn === 'boolean';
}

/** The accounts list from the API, keeping only well-formed rows. */
export function parseDevAccounts(raw: unknown): DevSignInAccount[] {
  return Array.isArray(raw) ? raw.filter(isAccount) : [];
}

export function groupDevAccounts(accounts: DevSignInAccount[]): DevSignInGroups {
  return {
    own: accounts.filter((account: DevSignInAccount) => account.isOwn),
    roles: accounts.filter((account: DevSignInAccount) => !account.isOwn),
  };
}

/** The muted line under the name. */
export function devAccountSubtitle(account: DevSignInAccount): string {
  const detail = account.detail.trim();
  if (detail) return detail;
  return ROLE_LABELS[account.role] ?? account.role.replace(/_/g, ' ');
}

export function devSignInErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { status?: number; data?: { error?: unknown; message?: unknown } } };
  const data = axiosErr?.response?.data;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (axiosErr?.response?.status === 404) {
    return 'The backend has development sign-in turned off. Set DEV_SIGN_IN=true in its .env and restart it.';
  }
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
